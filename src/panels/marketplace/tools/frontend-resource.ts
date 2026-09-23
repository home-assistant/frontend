import type { RepositoryBase } from "../data/repository";

// Downloaded frontend resources land in www/community/, which is served as /local/.
export const generateFrontendResourceURL = (options: {
  repository: RepositoryBase;
}): string =>
  `/local/community/${options.repository.full_name.split("/")[1]}/${options.repository.file_name}`;
