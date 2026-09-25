#!/usr/bin/env node
// Fails the check when a pull request carries a label that blocks merging, and
// writes the outcome to the job summary. Invoked from the `check` job in
// .github/workflows/blocking-labels.yaml via actions/github-script:
//
//   const { default: checkBlockingLabels } =
//     await import(`${process.env.GITHUB_WORKSPACE}/.github/scripts/check-blocking-labels.mjs`);
//   await checkBlockingLabels({ github, context, core });

export default async function checkBlockingLabels({ context, core }) {
  const blockingLabels = [
    "wait for backend",
    "Needs UX",
    "Do Not Review",
    "Blocked",
    "has-parent",
  ];
  const prLabels = context.payload.pull_request.labels.map((l) => l.name);
  const found = blockingLabels.filter((bl) => prLabels.includes(bl));
  if (found.length > 0) {
    const message = `This Pull Request is blocked by label${found.length > 1 ? "s" : ""}: ${found.join(", ")}`;
    await core.summary
      .addHeading(":no_entry_sign: Pull Request is blocked", 2)
      .addRaw(message)
      .write();
    core.setFailed(message);
  } else {
    await core.summary
      .addHeading(
        ":white_check_mark: Pull Request is clear to merge after review",
        2
      )
      .addRaw(
        "This Pull Request is not blocked by any labels which prevent it from being merged."
      )
      .write();
  }
}
