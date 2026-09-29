import type { RepositoryBase } from "../../../data/marketplace/repository";

// Downloaded frontend resources land in www/community/, which is served as /local/.
// A card keeps the folder it was installed to, also when it is renamed later on.
export const generateFrontendResourceURL = (options: {
  repository: RepositoryBase;
}): string => {
  const folder =
    options.repository.local_path.split("/").filter(Boolean).pop() ||
    options.repository.full_name.split("/")[1];
  return `/local/community/${folder}/${options.repository.file_name}`;
};
