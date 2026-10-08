#!/usr/bin/env node
/**
 * Applies the Companion App, Labs and Supervisor labels to pull requests.
 *
 * These areas are often changed from code outside their folders, which
 * actions/labeler can't see, so this script owns them and .github/labeler.yml
 * leaves them out.
 *
 * A label matches when the pull request:
 * - changes a file in one of the area's paths, or
 * - adds or removes a line that uses the area's API, such as gating a feature
 *   behind Labs or only showing it on Supervisor installs.
 *
 * Like actions/labeler, a label is removed once the pull request no longer
 * matches, including one added by hand.
 *
 * Invoked from the `triage` job in .github/workflows/labeler.yaml.
 */

import type {
  GitHubScriptArgs,
  PullRequestPayload,
} from "./github-script.d.ts";
import { withRetry } from "./github-retry.mts";

const RULES: { label: string; paths: RegExp[]; pattern: RegExp }[] = [
  {
    label: "Companion App",
    paths: [/^src\/external_app\//],
    // Reads or messages the companion app the frontend is running in
    pattern: /\bauth\.external\b|\bfireExternalBusMessage\(/,
  },
  {
    label: "Labs",
    paths: [/^src\/panels\/config\/labs\//, /^src\/data\/labs\.ts$/],
    // Gates a feature behind, or toggles, a Labs preview feature
    pattern:
      /\b(?:subscribeLabFeatures?|fetchLabFeatures|labsUpdatePreviewFeature)\(/,
  },
  {
    label: "Supervisor",
    paths: [
      /^src\/panels\/config\/apps\//,
      /^src\/data\/hassio\//,
      /^src\/data\/supervisor\//,
    ],
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
  const existing = new Set(pr.labels.map((l) => l.name));

  // Bot pull requests, such as Prettier bumps, rewrite code they don't change
  const checkCode = pr.user.type !== "Bot";

  const { owner, repo } = context.repo;

  const files = await withRetry("pull request files", () =>
    github.paginate(github.rest.pulls.listFiles, {
      owner,
      repo,
      pull_number: pr.number,
      per_page: 100,
    })
  );

  const add: string[] = [];
  const remove: string[] = [];

  for (const rule of RULES) {
    const match = files.find(
      (file) =>
        rule.paths.some((path) => path.test(file.filename)) ||
        (checkCode &&
          file.patch !== undefined &&
          changesMatch(file.patch, rule.pattern))
    );

    if (match && !existing.has(rule.label)) {
      core.info(`Adding ${rule.label} for ${match.filename}`);
      add.push(rule.label);
    } else if (!match && existing.has(rule.label)) {
      core.info(`Removing ${rule.label}, no longer matched`);
      remove.push(rule.label);
    }
  }

  await Promise.all(
    remove.map((name) =>
      withRetry("label removal", async () => {
        try {
          await github.rest.issues.removeLabel({
            owner,
            repo,
            issue_number: pr.number,
            name,
          });
        } catch (error) {
          // Already removed, such as by hand or a run that raced this one
          if (
            typeof error !== "object" ||
            error === null ||
            !("status" in error) ||
            error.status !== 404
          ) {
            throw error;
          }
        }
      })
    )
  );

  if (add.length === 0) {
    return;
  }

  await withRetry("label addition", () =>
    github.rest.issues.addLabels({
      owner,
      repo,
      issue_number: pr.number,
      labels: add,
    })
  );
}
