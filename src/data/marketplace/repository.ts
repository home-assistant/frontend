import type { HomeAssistant } from "../../types";

type CallWS = Pick<HomeAssistant, "callWS">;

export type RepositoryType = "integration" | "plugin" | "template" | "theme";

export interface RepositoryBase {
  authors: string[];
  available_version: string;
  can_install: boolean;
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
  last_updated: string | number;
  local_path: string;
  name: string;
  new: boolean;
  pending_upgrade: boolean;
  stars: number;
  status:
    "pending-restart" | "pending-upgrade" | "new" | "installed" | "default";
  topics: string[];
}

export interface RepositoryInfo extends RepositoryBase {
  additional_info: string;
  default_branch: string;
  issues: number;
  releases: string[];
  ref: string;
  replaces_built_in: boolean;
  selected_tag: string | null;
  update_entity_id: string | null;
  version_or_commit: "version" | "commit";
}

export interface MarketplaceRelease {
  tag: string;
  name: string;
  published_at: string;
  prerelease: boolean;
}

export const fetchMarketplaceRepositories = (hass: CallWS) =>
  hass.callWS<RepositoryBase[]>({ type: "marketplace/repositories/list" });

export const fetchMarketplaceRepository = (
  hass: CallWS,
  repositoryId: string
) =>
  hass.callWS<RepositoryInfo>({
    type: "marketplace/repository/info",
    repository_id: repositoryId,
  });

export const fetchMarketplaceRepositoryReleases = (
  hass: CallWS,
  repositoryId: string
) =>
  hass.callWS<MarketplaceRelease[]>({
    type: "marketplace/repository/releases",
    repository_id: repositoryId,
  });

export const installMarketplaceRepository = (
  hass: CallWS,
  repositoryId: string,
  version?: string,
  options: { confirmReplaceBuiltIn?: boolean } = {}
) =>
  hass.callWS<null>({
    type: "marketplace/repository/install",
    repository: repositoryId,
    version,
    // A first installation over a built-in integration is refused without it
    ...(options.confirmReplaceBuiltIn
      ? { confirm_replace_built_in: true }
      : {}),
  });

// Removes what was installed, the repository stays in the Marketplace
export const uninstallMarketplaceRepository = (
  hass: CallWS,
  repositoryId: string
) =>
  hass.callWS<null>({
    type: "marketplace/repository/uninstall",
    repository: repositoryId,
  });

// Fetches the information of the repository from GitHub again
export const refreshMarketplaceRepository = (
  hass: CallWS,
  repositoryId: string
) =>
  hass.callWS<null>({
    type: "marketplace/repository/refresh",
    repository: repositoryId,
  });

export const addMarketplaceRepository = (
  hass: CallWS,
  repository: string,
  category: RepositoryType
) =>
  hass.callWS<null>({
    type: "marketplace/repositories/add",
    repository,
    category,
  });

// The types the content of a repository fits, before it is added
export const detectMarketplaceRepository = (hass: CallWS, repository: string) =>
  hass.callWS<{ categories: RepositoryType[] }>({
    type: "marketplace/repositories/detect",
    repository,
  });

// Removes a custom repository from the list
export const removeMarketplaceRepository = (
  hass: CallWS,
  repositoryId: string
) =>
  hass.callWS<null>({
    type: "marketplace/repositories/remove",
    repository: repositoryId,
  });

export const dismissNewMarketplaceRepositories = (
  hass: CallWS,
  categories: RepositoryType[]
) =>
  hass.callWS<null>({
    type: "marketplace/repositories/clear_new",
    categories,
  });

export const dismissNewMarketplaceRepository = (
  hass: CallWS,
  repositoryId: string
) =>
  hass.callWS<null>({
    type: "marketplace/repositories/clear_new",
    repository: repositoryId,
  });
