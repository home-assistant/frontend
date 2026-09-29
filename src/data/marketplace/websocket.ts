import { fireEvent } from "../../common/dom/fire_event";
import type { HomeAssistant } from "../../types";
import type { MarketplaceData, MarketplaceInfo } from "./marketplace";
import type { MarketplaceDispatchEvent } from "./common";
import type { RepositoryBase } from "./repository";

export const fetchMarketplaceInfo = async (
  hass: Pick<HomeAssistant, "connection">
) =>
  hass.connection.sendMessagePromise<MarketplaceInfo>({
    type: "marketplace/info",
  });

// Adding a custom repository answers with this while GitHub is not connected.
export const ERROR_GITHUB_NOT_CONNECTED = "github_not_connected";

// Commands answer with this until the Marketplace config entry is loaded.
export const ERROR_NOT_LOADED = "not_loaded";

// Anonymous GitHub requests share a small hourly limit per address.
export const ERROR_GITHUB_RATE_LIMITED = "github_rate_limited";

// Downloading and adding repositories answer with this until the warning
// screen is accepted.
export const ERROR_WARNING_NOT_ACCEPTED = "warning_not_accepted";

export const isWebSocketError = (err: unknown, code: string): boolean =>
  (err as { code?: unknown } | null)?.code === code;

export const acceptWarning = async (hass: Pick<HomeAssistant, "connection">) =>
  hass.connection.sendMessagePromise<null>({
    type: "marketplace/warning/accept",
  });

// Refetches the information so the panel shows the warning screen, returns
// whether the error was handled.
export const handleWarningNotAccepted = (err: unknown): boolean => {
  if (!isWebSocketError(err, ERROR_WARNING_NOT_ACCEPTED)) {
    return false;
  }

  fireEvent(window, "marketplace-refresh");
  return true;
};

export const connectGitHub = async (hass: Pick<HomeAssistant, "connection">) =>
  hass.connection.sendMessagePromise<{ flow_id: string }>({
    type: "marketplace/github/connect",
  });

export const getRepositories = async (
  hass: Pick<HomeAssistant, "connection">
) =>
  hass.connection.sendMessagePromise<RepositoryBase[]>({
    type: "marketplace/repositories/list",
  });

export const repositoryUninstall = async (
  hass: Pick<HomeAssistant, "connection">,
  repository: string
) =>
  hass.connection.sendMessagePromise<unknown>({
    type: "marketplace/repository/remove",
    repository,
  });

export const repositoryAdd = async (
  hass: Pick<HomeAssistant, "connection">,
  repository: string,
  category: string
) =>
  hass.connection.sendMessagePromise<unknown>({
    type: "marketplace/repositories/add",
    repository: repository,
    category,
  });

export const repositoryUpdate = async (
  hass: Pick<HomeAssistant, "connection">,
  repository: string
) =>
  hass.connection.sendMessagePromise<unknown>({
    type: "marketplace/repository/refresh",
    repository,
  });

export const repositoryDelete = async (
  hass: Pick<HomeAssistant, "connection">,
  repository: string
) =>
  hass.connection.sendMessagePromise<unknown>({
    type: "marketplace/repositories/remove",
    repository,
  });

export const repositoriesClearNew = async (
  hass: Pick<HomeAssistant, "connection">,
  marketplace: MarketplaceData
) =>
  hass.connection.sendMessagePromise<unknown>({
    type: "marketplace/repositories/clear_new",
    categories: marketplace.info.categories,
  });

export const repositoriesClearNewRepository = async (
  hass: Pick<HomeAssistant, "connection">,
  repository: string
) =>
  hass.connection.sendMessagePromise<unknown>({
    type: "marketplace/repositories/clear_new",
    repository,
  });

// The backend sends its errors translated, as an object with a message or a string.
export const websocketErrorMessage = (err: unknown): string | undefined => {
  if (typeof err === "string") {
    return err || undefined;
  }
  const message = (err as { message?: unknown } | null)?.message;
  return typeof message === "string" && message ? message : undefined;
};

export const websocketSubscription = (
  hass: Pick<HomeAssistant, "connection">,
  onChange: (result: Record<string, unknown> | null) => void,
  event: MarketplaceDispatchEvent
) =>
  hass.connection.subscribeMessage(onChange, {
    type: "marketplace/subscribe",
    signal: event,
  });
