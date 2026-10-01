import type { RepositoryBase } from "../../../data/marketplace/repository";

// Downloaded frontend resources land in www/community/, which is served as /local/.
// A card keeps the folder it was installed to, also when it is renamed later on.
// /local is cached for a month, the version makes browsers load an update.
export const generateFrontendResourceURL = (options: {
  repository: RepositoryBase;
  version: string;
}): string => {
  const folder =
    options.repository.local_path.split("/").filter(Boolean).pop() ||
    options.repository.full_name.split("/")[1];
  return `/local/community/${encodeURIComponent(folder)}/${encodeURIComponent(
    options.repository.file_name
  )}?v=${encodeURIComponent(options.version)}`;
};
