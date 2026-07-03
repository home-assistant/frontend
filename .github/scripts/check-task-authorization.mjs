#!/usr/bin/env node
// Restricts Task issues to organization members: closes and labels the issue with
// an explanatory comment when the author is not an org member. Invoked from the
// `check-authorization` job in .github/workflows/restrict-task-creation.yaml via
// actions/github-script:
//
//   const { default: checkTaskAuthorization } =
//     await import(`${process.env.GITHUB_WORKSPACE}/.github/scripts/check-task-authorization.mjs`);
//   await checkTaskAuthorization({ github, context, core });

export default async function checkTaskAuthorization({
  github,
  context,
  core,
}) {
  const issueAuthor = context.payload.issue.user.login;

  // Check if user is an organization member
  try {
    await github.rest.orgs.checkMembershipForUser({
      org: "home-assistant",
      username: issueAuthor,
    });
    core.info(`✅ ${issueAuthor} is an organization member`);
    return; // Authorized
  } catch (_error) {
    core.info(`❌ ${issueAuthor} is not authorized to create Task issues`);
  }

  // Close the issue with a comment
  await github.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    body:
      `Hi @${issueAuthor}, thank you for your contribution!\n\n` +
      `Task issues are restricted to Open Home Foundation staff and authorized contributors.\n\n` +
      `If you would like to:\n` +
      `- Report a bug: Please use the [bug report form](https://github.com/home-assistant/frontend/issues/new?template=bug_report.yml)\n` +
      `- Request a feature: Please submit to [Feature Requests](https://github.com/orgs/home-assistant/discussions)\n\n` +
      `If you believe you should have access to create Task issues, please contact the maintainers.`,
  });

  await github.rest.issues.update({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    state: "closed",
  });

  // Add a label to indicate this was auto-closed
  await github.rest.issues.addLabels({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    labels: ["auto-closed"],
  });
}
