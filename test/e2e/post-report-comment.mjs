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
const COMMENT_MARKER = "<!-- playwright-e2e-report -->";
const COMMENT_HEADING = "## Playwright E2E tests failed";

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
      for (const test of spec.tests ?? []) {
        const attempts = [];
        for (const [index, result] of (test.results ?? []).entries()) {
          const errors = [];
          for (const err of result.errors ?? []) {
            if (err.message) errors.push(stripAnsi(err.message));
          }
          if (errors.length) attempts.push({ index: index + 1, errors });
        }
        if (!attempts.length) continue;

        const title = [...here, spec.title].join(" › ");
        failures.push({
          title: test.projectName ? `\`${test.projectName}\` ${title}` : title,
          location: `${spec.file ?? suite.file ?? ""}:${spec.line ?? ""}`,
          attempts,
        });
      }
    }
    for (const child of suite.suites ?? []) walk(child, here);
  };

  for (const suite of report.suites ?? []) walk(suite, []);
  return failures;
};

const formatFailure = (failure) => {
  const output =
    failure.attempts
      .map(({ index, errors }) =>
        [`Attempt ${index}`, "", errors.join("\n\n")].join("\n")
      )
      .join("\n\n")
      .trim() || "(no error output captured)";
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

  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: context.issue.number,
    per_page: 100,
  });
  const previousComments = comments.filter(
    (comment) =>
      comment.user?.login === "github-actions[bot]" &&
      (comment.body?.includes(COMMENT_MARKER) ||
        comment.body?.startsWith(COMMENT_HEADING))
  );

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
    COMMENT_MARKER,
    COMMENT_HEADING,
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

  const batches = Array.from(
    { length: Math.ceil(previousComments.length / 100) },
    (_, index) => previousComments.slice(index * 100, (index + 1) * 100)
  );
  const commentsToMinimize = (
    await Promise.all(
      batches.map(async (batch) => {
        const { nodes } = await github.graphql(
          `query($ids: [ID!]!) {
            nodes(ids: $ids) {
              ... on IssueComment {
                id
                isMinimized
              }
            }
          }`,
          { ids: batch.map((comment) => comment.node_id) }
        );
        return nodes.filter((node) => !node.isMinimized);
      })
    )
  ).flat();

  await Promise.all(
    commentsToMinimize.map((comment) =>
      github.graphql(
        `mutation($id: ID!) {
          minimizeComment(input: { subjectId: $id, classifier: OUTDATED }) {
            clientMutationId
          }
        }`,
        { id: comment.id }
      )
    )
  );
}
