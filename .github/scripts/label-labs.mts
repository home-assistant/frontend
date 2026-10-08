#!/usr/bin/env node
// Adds the Labs label to pull requests that touch Labs. Features gated behind a
// Labs preview feature live outside the Labs page and actions/labeler can only
// match paths, so this also checks added lines for the Labs API. It only adds
// the label, so one added by hand stays. Invoked from the `triage` job in
// .github/workflows/labeler.yaml via actions/github-script:
//
//   const { default: labelLabs } =
//     await import(`${process.env.GITHUB_WORKSPACE}/.github/scripts/label-labs.mts`);
//   await labelLabs({ github, context, core });

import type {
  GitHubScriptArgs,
  PullRequestPayload,
} from "./github-script.d.ts";
import { withRetry } from "./github-retry.mts";

const LABEL = "Labs";

const PATHS = [/^src\/panels\/config\/labs\//, /^src\/data\/labs\.ts$/];

const LABS_API =
  /\b(?:subscribeLabFeatures?|fetchLabFeatures|labsUpdatePreviewFeature)\b|data\/labs["']/;

const addsLabsApi = (patch: string) =>
  patch
    .split("\n")
    .some(
      (line) =>
        line.startsWith("+") && !line.startsWith("+++") && LABS_API.test(line)
    );

export default async function labelLabs({
  github,
  context,
  core,
}: GitHubScriptArgs<PullRequestPayload>) {
  const pr = context.payload.pull_request;

  if (pr.labels.some((l) => l.name === LABEL)) {
    core.info(`Already labelled ${LABEL}`);

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

  const match = files.find(
    (file) =>
      PATHS.some((path) => path.test(file.filename)) ||
      (file.patch !== undefined && addsLabsApi(file.patch))
  );

  if (!match) {
    core.info("No Labs changes found");

    return;
  }

  core.info(`Adding ${LABEL} for ${match.filename}`);
  await withRetry("label addition", () =>
    github.rest.issues.addLabels({
      owner,
      repo,
      issue_number: pr.number,
      labels: [LABEL],
    })
  );
}
