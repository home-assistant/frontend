#!/usr/bin/env node
// Builds and posts a PR comment summarising Playwright E2E failures from the
// merged JSON report. Invoked from the `report` job in .github/workflows/e2e.yaml
// via actions/github-script:
//
//   const { default: postReportComment } =
//     await import("${{ github.workspace }}/test/e2e/post-report-comment.mjs");
//   await postReportComment({ github, context, core });

import { readFileSync } from "fs";

const REPORT_PATH = "test/e2e/reports/combined/results.json";

// GitHub comment bodies cap at 65536 chars; leave headroom.
const MAX_BODY = 60000;

// Strip ANSI colour codes that Playwright bakes into error messages.
// eslint-disable-next-line no-control-regex
const stripAnsi = (s) => s.replace(/\u001b\[[0-9;]*m/g, "");

// Walk the JSON report tree and collect every failing spec with its error
// output, so the comment shows the actual test failures.
const collectFailures = (report) => {
  const failures = [];

  const walk = (suite, titlePath) => {
    const here = suite.title ? [...titlePath, suite.title] : titlePath;
    for (const spec of suite.specs ?? []) {
      if (spec.ok) continue;
      const errors = [];
      for (const test of spec.tests ?? []) {
        for (const result of test.results ?? []) {
          for (const err of result.errors ?? []) {
            if (err.message) errors.push(stripAnsi(err.message));
          }
        }
      }
      failures.push({
        title: [...here, spec.title].join(" › "),
        location: `${spec.file ?? suite.file ?? ""}:${spec.line ?? ""}`,
        errors,
      });
    }
    for (const child of suite.suites ?? []) walk(child, here);
  };

  for (const suite of report.suites ?? []) walk(suite, []);
  return failures;
};

const formatFailure = (failure) => {
  const output =
    failure.errors.join("\n\n").trim() || "(no error output captured)";
  return [
    `<details><summary>❌ ${failure.title} <code>${failure.location}</code></summary>`,
    "",
    "```ts",
    output,
    "```",
    "",
    "</details>",
  ].join("\n");
};

export default async function postReportComment({ github, context, core }) {
  const { owner, repo } = context.repo;
  const runUrl = `${context.serverUrl}/${owner}/${repo}/actions/runs/${context.runId}`;

  let stats = { expected: 0, unexpected: 0, flaky: 0, skipped: 0 };
  let failures = [];

  try {
    const report = JSON.parse(readFileSync(REPORT_PATH, "utf8"));
    stats = report.stats ?? stats;
    failures = collectFailures(report);
  } catch (err) {
    core.warning(`Could not parse Playwright JSON report: ${err.message}`);
  }

  const summaryLine =
    `**${stats.unexpected} failed**, ${stats.expected} passed` +
    (stats.flaky ? `, ${stats.flaky} flaky` : "") +
    (stats.skipped ? `, ${stats.skipped} skipped` : "");

  const details = failures.length
    ? failures.map(formatFailure).join("\n")
    : "_No failing tests were captured in the report._";

  let body = [
    "## Playwright E2E tests failed",
    "",
    summaryLine,
    "",
    details,
    "",
    "The combined HTML report is available as a workflow artifact.",
    "",
    `[View workflow run](${runUrl})`,
  ].join("\n");

  if (body.length > MAX_BODY) {
    body = `${body.slice(0, MAX_BODY)}\n\n_…report truncated, see the full HTML report artifact._`;
  }

  await github.rest.issues.createComment({
    owner,
    repo,
    issue_number: context.issue.number,
    body,
  });
}
