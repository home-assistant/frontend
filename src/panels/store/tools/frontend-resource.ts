import type { RepositoryInfo } from "../data/repository";

export const generateFrontendResourceURL = (options: {
  repository: RepositoryInfo;
  version?: string;
}): string =>
  `/hacsfiles/${options.repository.full_name.split("/")[1]}/${options.repository.file_name}`;
