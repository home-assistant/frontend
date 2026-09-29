import type { HomeAssistant } from "../../types";

export type RepositoryType = "integration" | "plugin" | "template" | "theme";

export interface RepositoryBase {
  authors: string[];
  available_version: string;
  can_download: boolean;
  category: RepositoryType;
  config_flow: boolean;
  custom: boolean;
  description: string;
  domain: string | null;
  downloads: number;
  file_name: string;
  full_name: string;
  hide: boolean;
  homeassistant: string | null;
  id: string;
  installed_version: string;
  installed: boolean;
  last_updated: string;
  local_path: string;
  name: string;
  new: boolean;
  pending_upgrade: boolean;
  stars: number;
  state: string;
  status:
    "pending-restart" | "pending-upgrade" | "new" | "installed" | "default";
  topics: string[];
}

export interface RepositoryInfo extends RepositoryBase {
  additional_info: string;
  default_branch: string;
  hide_default_branch: boolean;
  issues: number;
  releases: string[];
  ref: string;
  replaces_built_in: boolean;
  selected_tag: string | null;
  version_or_commit: "version" | "commit";
}

export const fetchRepositoryInformation = async (
  hass: Pick<HomeAssistant, "connection">,
  repositoryId: string
): Promise<RepositoryInfo> =>
  hass.connection.sendMessagePromise({
    type: "marketplace/repository/info",
    repository_id: repositoryId,
  });

export const repositoryDownloadVersion = async (
  hass: Pick<HomeAssistant, "connection">,
  repository: string,
  version?: string,
  options: { confirmReplaceBuiltIn?: boolean } = {}
) =>
  hass.connection.sendMessagePromise<unknown>({
    type: "marketplace/repository/download",
    repository: repository,
    version,
    // A first download over a built-in integration is refused without it
    ...(options.confirmReplaceBuiltIn
      ? { confirm_replace_built_in: true }
      : {}),
  });

export const repositoryReleases = async (
  hass: Pick<HomeAssistant, "connection">,
  repositoryId: string
) =>
  hass.connection.sendMessagePromise<
    { tag: string; name: string; published_at: string; prerelease: boolean }[]
  >({
    type: "marketplace/repository/releases",
    repository_id: repositoryId,
  });
