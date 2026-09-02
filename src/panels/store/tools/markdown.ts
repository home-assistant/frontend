import type { RepositoryInfo } from "../data/repository";

const showGitHubWeb = (text: string) =>
  text.toLowerCase().includes(".md") || text.toLowerCase().includes(".markdown");

export const markdownWithRepositoryContext = (input: string, repository?: RepositoryInfo) => {
  // Handle convertion to raw GitHub URL
  input = input.replace(
    /https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\s]+)/g,
    function (x, owner, repo, path) {
      return showGitHubWeb(x) ? x : `https://raw.githubusercontent.com/${owner}/${repo}/${path}`;
    },
  );

  // Handle relative links
  if (repository) {
    input = input.replace(/\[.*?\]\([^#](?!.*?:\/\/).*?\)/g, function (x) {
      const showWeb = showGitHubWeb(x);
      return x
        .replace("(/", "(")
        .replace(
          "(",
          `(${showWeb ? `https://github.com` : `https://raw.githubusercontent.com`}/${
            repository.full_name
          }${showWeb ? "/blob" : ""}/${repository.available_version || repository.default_branch}/`,
        );
    });

    // Handle anchor refrences
    input = input.replace(/\[.*\]\(\#.*\)/g, function (x) {
      return x.replace("(#", `(/hacs/repository/${repository.id}#`);
    });

    // Add references to issues and PRs
    input = input.replace(/(?:\w[\w-.]+\/\w[\w-.]+|\B)#[1-9]\d*\b/g, (reference) => {
      const fullReference = reference.replace(/^#/, `${repository.full_name}#`);
      const [fullName, issue] = fullReference.split("#");
      return `[${reference}](https://github.com/${fullName}/issues/${issue})`;
    });
  }
  return input;
};
