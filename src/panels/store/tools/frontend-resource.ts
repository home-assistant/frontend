import type { RepositoryBase } from "../data/repository";

// Downloaded frontend resources are served from /hacsfiles/ by the backend.
export const generateFrontendResourceURL = (options: {
  repository: RepositoryBase;
}): string =>
  `/hacsfiles/${options.repository.full_name.split("/")[1]}/${options.repository.file_name}`;
