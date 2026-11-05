import type { RepositoryBase } from "../../../data/marketplace/repository";

// These organizations host the work of many people, their name says nothing
// about who made a repository.
const COMMUNITY_ORGANIZATIONS = [
  "custom-cards",
  "custom-components",
  "home-assistant-community-themes",
];

// The authors the repository names, or its owner when it names none
export const repositoryAuthors = (repository: RepositoryBase): string[] => {
  const authors = (repository.authors ?? []).map((author) =>
    author.replace("@", "")
  );
  return authors.length > 0 ? authors : [repository.full_name.split("/")[0]];
};

export const isCommunityOrganization = (author: string): boolean =>
  COMMUNITY_ORGANIZATIONS.includes(author);
