import { fireEvent } from "../../../common/dom/fire_event";
import { deleteConfigFlow } from "../../../data/config_flow";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";
import type { MarketplaceInfo } from "../../../data/marketplace/marketplace";
import {
  ERROR_GITHUB_NOT_CONNECTED,
  ERROR_GITHUB_RATE_LIMITED,
  connectGitHub,
  fetchMarketplaceInfo,
  isWebSocketError,
} from "../../../data/marketplace/websocket";

// Dialogs get these from their contexts, not a whole hass object.
export type MarketplaceHass = Pick<
  HomeAssistant,
  "callApi" | "connection" | "localize"
>;

// Resolves with whether GitHub is connected once the flow dialog closes.
export const showConnectGitHubFlow = async (
  element: HTMLElement,
  hass: MarketplaceHass
): Promise<boolean> => {
  let flowId: string;
  try {
    flowId = (await connectGitHub(hass)).flow_id;
  } catch (err: any) {
    showAlertDialog(element, {
      title: hass.localize("ui.panel.marketplace.dialog.error.title"),
      text:
        err?.message ||
        hass.localize("ui.panel.marketplace.common.unknown_error"),
    });
    return false;
  }

  const flowFinished = await new Promise<boolean>((resolve) => {
    showConfigFlowDialog(element, {
      continueFlowId: flowId,
      dialogClosedCallback: (params) => resolve(params.flowFinished),
    });
  });

  // The element that opened the flow can be gone by now.
  fireEvent(window, "marketplace-refresh");

  // The dialog leaves continued flows running, but nobody else uses this one.
  if (!flowFinished) {
    deleteConfigFlow(hass, flowId).catch(() => undefined);
    return false;
  }

  // A finished flow can also be an abort, so ask the backend.
  try {
    return (await fetchMarketplaceInfo(hass)).github_connected;
  } catch {
    return false;
  }
};

// Opens the connect flow instead of adding a custom repository, returns
// whether adding can go ahead.
export const ensureGitHubConnected = (
  element: HTMLElement,
  hass: MarketplaceHass,
  info: MarketplaceInfo
): boolean => {
  if (info.github_connected) {
    return true;
  }

  showConnectGitHubFlow(element, hass);
  return false;
};

// Covers adding a custom repository refused because GitHub got disconnected
// after the panel fetched its information, returns whether the error was
// handled.
export const handleGitHubNotConnected = (
  element: HTMLElement,
  hass: MarketplaceHass,
  err: unknown
): boolean => {
  if (!isWebSocketError(err, ERROR_GITHUB_NOT_CONNECTED)) {
    return false;
  }

  showConnectGitHubFlow(element, hass);
  return true;
};

// Anonymous requests share a small hourly limit, connecting GitHub raises it.
// Returns whether the error was handled.
export const handleGitHubRateLimited = (
  element: HTMLElement,
  hass: MarketplaceHass,
  err: unknown
): boolean => {
  if (!isWebSocketError(err, ERROR_GITHUB_RATE_LIMITED)) {
    return false;
  }

  showConfirmationDialog(element, {
    title: hass.localize("ui.panel.marketplace.github.rate_limited_title"),
    text: hass.localize("ui.panel.marketplace.github.rate_limited"),
    confirmText: hass.localize("ui.panel.marketplace.github.connect"),
    dismissText: hass.localize("ui.common.close"),
    confirm: () => {
      showConnectGitHubFlow(element, hass);
    },
  });
  return true;
};
