import type { LocalizeFunc } from "../../common/translations/localize";
import type { HomeAssistant } from "../../types";
import { MarketplaceDispatchEvent } from "./common";
import type { MarketplaceInfo } from "./marketplace";

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

// The backend sends its errors translated, as an object with a message or a string.
export const websocketErrorMessage = (err: unknown): string | undefined => {
  if (typeof err === "string") {
    return err || undefined;
  }
  const message = (err as { message?: unknown } | null)?.message;
  return typeof message === "string" && message ? message : undefined;
};

// What to tell the user about a failed command, also when it has no message
export const marketplaceErrorMessage = (
  err: unknown,
  localize: LocalizeFunc
): string =>
  websocketErrorMessage(err) ||
  localize("ui.panel.marketplace.common.unknown_error");

export const fetchMarketplaceInfo = (hass: Pick<HomeAssistant, "callWS">) =>
  hass.callWS<MarketplaceInfo>({ type: "marketplace/info" });

export const acceptMarketplaceWarning = (hass: Pick<HomeAssistant, "callWS">) =>
  hass.callWS<null>({ type: "marketplace/warning/accept" });

// Starts the reconfigure flow of the entry that connects a GitHub account
export const connectMarketplaceGitHub = (hass: Pick<HomeAssistant, "callWS">) =>
  hass.callWS<{ flow_id: string }>({ type: "marketplace/github/connect" });

// The signals only say that something changed, the panel refetches
export const subscribeMarketplaceChanges = (
  hass: Pick<HomeAssistant, "connection">,
  signal: MarketplaceDispatchEvent,
  callback: () => void
) =>
  hass.connection.subscribeMessage(() => callback(), {
    type: "marketplace/subscribe",
    signal,
  });

export interface MarketplaceInstallProgress {
  repository: string;
  // A step of the installation, or false once it is done
  progress: number | false;
}

export const subscribeMarketplaceInstallProgress = (
  hass: Pick<HomeAssistant, "connection">,
  callback: (progress: MarketplaceInstallProgress) => void
) =>
  hass.connection.subscribeMessage<MarketplaceInstallProgress>(callback, {
    type: "marketplace/subscribe",
    signal: MarketplaceDispatchEvent.REPOSITORY_INSTALL_PROGRESS,
  });
