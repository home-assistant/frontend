#!/usr/bin/env node
// Adds area labels to pull requests from the code they change, as
// actions/labeler can only match paths. A rule matches when an added or removed
// line uses that area's API, such as gating a feature behind Labs or only
// showing it on Supervisor installs. It only adds labels, so one added by hand
// stays. Invoked from the `triage` job in .github/workflows/labeler.yaml via
// actions/github-script:
//
//   const { default: labelContent } =
//     await import(`${process.env.GITHUB_WORKSPACE}/.github/scripts/label-content.mts`);
//   await labelContent({ github, context, core });

import type {
  GitHubScriptArgs,
  PullRequestPayload,
} from "./github-script.d.ts";
import { withRetry } from "./github-retry.mts";

const RULES: { label: string; pattern: RegExp }[] = [
  {
    label: "Companion App",
    // Reads or messages the companion app the frontend is running in
    pattern: /\bauth\.external\b|\bfireExternalBusMessage\(/,
  },
  {
    label: "Labs",
    // Gates a feature behind, or toggles, a Labs preview feature
    pattern:
      /\b(?:subscribeLabFeatures?|fetchLabFeatures|labsUpdatePreviewFeature)\(/,
  },
  {
    label: "Supervisor",
    // Only runs on installs with the Supervisor
    pattern: /isComponentLoaded\([^)]*["']hassio["']/,
  },
];

const normalise = (line: string) => line.slice(1).replace(/\s+/g, "");

// Matching lines that were only moved, reindented or reformatted cancel out
const changesMatch = (patch: string, pattern: RegExp) => {
  const added: string[] = [];
  const removed: string[] = [];

  for (const line of patch.split("\n")) {
    if (
      line.startsWith("+++") ||
      line.startsWith("---") ||
      !pattern.test(line)
    ) {
      continue;
    }

    if (line.startsWith("+")) {
      added.push(normalise(line));
    } else if (line.startsWith("-")) {
      removed.push(normalise(line));
    }
  }

  return (
    added.some((line) => !removed.includes(line)) ||
    removed.some((line) => !added.includes(line))
  );
};

export default async function labelContent({
  github,
  context,
  core,
}: GitHubScriptArgs<PullRequestPayload>) {
  const pr = context.payload.pull_request;

  if (pr.user.type === "Bot") {
    core.info(`Skipping bot author: ${pr.user.login}`);

    return;
  }

  const existing = new Set(pr.labels.map((l) => l.name));
  const rules = RULES.filter((rule) => !existing.has(rule.label));

  if (rules.length === 0) {
    core.info("All content labels already applied");

    return;
  }

  const { owner, repo } = context.repo;

  const files = await withRetry("pull request files", () =>
    github.paginate(github.rest.pulls.listFiles, {
      owner,
      repo,
      pull_number: pr.number,
      per_page: 100,
    })
  );

  const labels: string[] = [];

  for (const rule of rules) {
    const match = files.find(
      (file) =>
        file.patch !== undefined && changesMatch(file.patch, rule.pattern)
    );

    if (match) {
      core.info(`Adding ${rule.label} for ${match.filename}`);
      labels.push(rule.label);
    }
  }

  if (labels.length === 0) {
    core.info("No content labels to add");

    return;
  }

  await withRetry("label addition", () =>
    github.rest.issues.addLabels({
      owner,
      repo,
      issue_number: pr.number,
      labels,
    })
  );
}
