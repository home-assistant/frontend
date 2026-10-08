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

const describeError = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

const isNotFound = (cause: unknown) =>
  cause instanceof Error && "status" in cause && cause.status === 404;

export default async function labelContent({
  github,
  context,
  core,
}: GitHubScriptArgs<PullRequestPayload>) {
  const pr = context.payload.pull_request;
  const existing = new Set(pr.labels.map((l) => l.name));
  const results: string[][] = [];
  const warnings: string[] = [];

  const warn = (message: string) => {
    core.warning(message);
    warnings.push(message);
  };

  const writeSummary = async () => {
    core.summary.addHeading("Content labels", 2);

    if (results.length > 0) {
      core.summary.addTable([
        ["Label", "Change", "Reason"].map((data) => ({ data, header: true })),
        ...results,
      ]);
    } else {
      core.summary.addRaw("No content labels changed.\n");
    }

    if (warnings.length > 0) {
      core.summary
        .addHeading("Warnings", 3)
        .addRaw(`${warnings.map((w) => `- ${w}`).join("\n")}\n`);
    }

    await core.summary.write();
  };

  if (process.env.LABELER_OUTCOME === "failure") {
    warn("Applying labels from .github/labeler.yml failed, see its step");
  }

  // Bot pull requests, such as Prettier bumps, rewrite code they don't change
  const checkCode = pr.user.type !== "Bot";

  const { owner, repo } = context.repo;

  let files;

  try {
    files = await withRetry("pull request files", () =>
      github.paginate(github.rest.pulls.listFiles, {
        owner,
        repo,
        pull_number: pr.number,
        per_page: 100,
      })
    );
  } catch (error) {
    warn(`Could not list the pull request's files: ${describeError(error)}`);
    await writeSummary();

    return;
  }

  const add: { label: string; reason: string }[] = [];
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
      add.push({ label: rule.label, reason: match.filename });
    } else if (!match && existing.has(rule.label)) {
      core.info(`Removing ${rule.label}, no longer matched`);
      remove.push(rule.label);
    }
  }

  const removals = await Promise.allSettled(
    remove.map((name) =>
      withRetry("label removal", () =>
        github.rest.issues.removeLabel({
          owner,
          repo,
          issue_number: pr.number,
          name,
        })
      )
    )
  );

  removals.forEach((removal, i) => {
    const name = remove[i];

    // Already removed, such as by hand or a run that raced this one
    if (removal.status === "fulfilled" || isNotFound(removal.reason)) {
      results.push([name, "Removed", "No longer matched"]);
    } else {
      warn(`Could not remove ${name}: ${describeError(removal.reason)}`);
    }
  });

  if (add.length > 0) {
    try {
      await withRetry("label addition", () =>
        github.rest.issues.addLabels({
          owner,
          repo,
          issue_number: pr.number,
          labels: add.map(({ label }) => label),
        })
      );
      results.push(...add.map(({ label, reason }) => [label, "Added", reason]));
    } catch (error) {
      warn(
        `Could not add ${add.map(({ label }) => label).join(", ")}: ${describeError(error)}`
      );
    }
  }

  await writeSummary();
}
