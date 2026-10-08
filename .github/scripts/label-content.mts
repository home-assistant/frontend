#!/usr/bin/env node
/**
 * Applies the Companion App, Home Assistant Link, Labs and Supervisor labels
 * to pull requests.
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
import { createSummary } from "./github-summary.mts";

const RULES: { label: string; paths: RegExp[]; pattern: RegExp }[] = [
  {
    label: "Companion App",
    paths: [
      /^src\/external_app\//,
      /^src\/data\/external\.ts$/,
      /^src\/util\/is_ios\.ts$/,
    ],
    // Reads or messages the companion app the frontend is running in, or
    // imports its modules. Matches imports of data/external rather than
    // isExternal, which is also a common local name.
    pattern:
      /\bauth\??\.external\b(?:[!?]*\.\w+\([^)]*)?|\bfireExternalBusMessage\([^)]*|(?:\bimport\s[^;]*?from\s*|\bimport\(\s*)["'][^"']*\/(?:external_app\/[^"']*|data\/external)["']/g,
  },
  {
    label: "Home Assistant Link",
    paths: [
      /^src\/panels\/config\/cloud\//,
      /^src\/data\/cloud\//,
      /^src\/data\/cloud\.ts$/,
    ],
    // Only runs when Home Assistant Link is set up
    pattern: /isComponentLoaded\([^)]*["']cloud["']/g,
  },
  {
    label: "Labs",
    paths: [/^src\/panels\/config\/labs\//, /^src\/data\/labs\.ts$/],
    // Gates a feature behind, or toggles, a Labs preview feature
    pattern:
      /\b(?:subscribeLabFeatures?|fetchLabFeatures|labsUpdatePreviewFeature)\([^)]*/g,
  },
  {
    label: "Supervisor",
    paths: [
      /^src\/panels\/config\/apps\//,
      /^src\/data\/hassio\//,
      /^src\/data\/supervisor\//,
    ],
    // Only runs on installs with the Supervisor
    pattern: /isComponentLoaded\([^)]*["']hassio["']/g,
  },
];

interface HunkSide {
  lines: string[];
  changed: boolean[];
}

interface CodeChange {
  code: string;
  filename: string;
}

const parseHunks = (patch: string) => {
  const hunks: { before: HunkSide; after: HunkSide }[] = [];

  for (const line of patch.split("\n")) {
    if (line.startsWith("@@")) {
      hunks.push({
        before: { lines: [], changed: [] },
        after: { lines: [], changed: [] },
      });
      continue;
    }

    const hunk = hunks.at(-1);

    if (!hunk || line.startsWith("\\")) {
      continue;
    }

    const text = line.slice(1);

    if (!line.startsWith("+")) {
      hunk.before.lines.push(text);
      hunk.before.changed.push(line.startsWith("-"));
    }

    if (!line.startsWith("-")) {
      hunk.after.lines.push(text);
      hunk.after.changed.push(line.startsWith("+"));
    }
  }

  return hunks;
};

// Ignores whitespace and trailing commas outside strings, as Prettier changes
// them when wrapping
const normaliseCode = (code: string) => {
  const parts = code.split(
    /("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)/
  );

  return parts
    .map((part, i) => {
      if (i % 2 === 1) {
        return part;
      }

      const stripped = part.replace(/\s+/g, "").replace(/,(?=[}\])])/g, "");

      return i === parts.length - 1 ? stripped.replace(/,$/, "") : stripped;
    })
    .join("");
};

// Matches whole calls, which can span lines, that touch a changed line
const changedMatches = (side: HunkSide, pattern: RegExp) => {
  const text = side.lines.join("\n");
  const matches: string[] = [];

  for (const match of text.matchAll(pattern)) {
    const first = text.slice(0, match.index).split("\n").length - 1;
    const last = first + match[0].split("\n").length - 1;

    if (side.changed.slice(first, last + 1).some(Boolean)) {
      matches.push(normaliseCode(match[0]));
    }
  }

  return matches;
};

// Matches that were only moved, reindented or reformatted cancel out in pairs,
// returning a file with a match that doesn't
const unmatchedChange = (added: CodeChange[], removed: CodeChange[]) => {
  const remaining = [...removed];

  for (const change of added) {
    const index = remaining.findIndex(({ code }) => code === change.code);

    if (index === -1) {
      return change.filename;
    }

    remaining.splice(index, 1);
  }

  return remaining[0]?.filename;
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

  const summary = createSummary(core, {
    heading: "Content labels",
    columns: ["Label", "Change", "Reason"],
    empty: "No content labels changed.",
  });

  if (process.env.LABELER_OUTCOME === "failure") {
    summary.warn(
      "Applying labels from .github/labeler.yml failed, see its step"
    );
  }

  // Bot pull requests, such as Prettier bumps, rewrite code they don't change
  const checkCode = pr.user.type !== "Bot";

  const { owner, repo } = context.repo;

  let files;
  let existing: Set<string>;

  try {
    // Read the current labels, as the event's snapshot can be stale by now
    const [fileList, labels] = await Promise.all([
      withRetry("pull request files", () =>
        github.paginate(github.rest.pulls.listFiles, {
          owner,
          repo,
          pull_number: pr.number,
          per_page: 100,
        })
      ),
      withRetry("pull request labels", () =>
        github.paginate(github.rest.issues.listLabelsOnIssue, {
          owner,
          repo,
          issue_number: pr.number,
          per_page: 100,
        })
      ),
    ]);

    files = fileList;
    existing = new Set(labels.map((l) => l.name));
  } catch (error) {
    summary.warn(
      `Could not read the pull request's files and labels: ${describeError(error)}`
    );
    await summary.write();

    return;
  }

  const add: { label: string; reason: string }[] = [];
  const remove: string[] = [];

  for (const rule of RULES) {
    const added: CodeChange[] = [];
    const removed: CodeChange[] = [];

    if (checkCode) {
      for (const { filename, patch } of files) {
        for (const { before, after } of parseHunks(patch ?? "")) {
          for (const code of changedMatches(after, rule.pattern)) {
            added.push({ code, filename });
          }

          for (const code of changedMatches(before, rule.pattern)) {
            removed.push({ code, filename });
          }
        }
      }
    }

    const match =
      files.find((file) => rule.paths.some((path) => path.test(file.filename)))
        ?.filename ?? unmatchedChange(added, removed);

    if (match && !existing.has(rule.label)) {
      core.info(`Adding ${rule.label} for ${match}`);
      add.push({ label: rule.label, reason: match });
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
      summary.addRow(name, "Removed", "No longer matched");
    } else {
      summary.warn(
        `Could not remove ${name}: ${describeError(removal.reason)}`
      );
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

      for (const { label, reason } of add) {
        summary.addRow(label, "Added", reason);
      }
    } catch (error) {
      summary.warn(
        `Could not add ${add.map(({ label }) => label).join(", ")}: ${describeError(error)}`
      );
    }
  }

  await summary.write();
}
