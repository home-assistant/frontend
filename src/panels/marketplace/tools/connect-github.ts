import { deleteConfigFlow } from "../../../data/config_flow";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type { HomeAssistant } from "../../../types";
import type { MarketplaceInfo } from "../../../data/marketplace/marketplace";
import {
  connectMarketplaceGitHub,
  ERROR_GITHUB_NOT_CONNECTED,
  ERROR_GITHUB_RATE_LIMITED,
  fetchMarketplaceInfo,
  isWebSocketError,
  marketplaceErrorMessage,
} from "../../../data/marketplace/websocket";

// The API pages and dialogs get from their context.
export type MarketplaceApi = Pick<HomeAssistant, "callApi" | "callWS">;

// Resolves with whether GitHub is connected once the flow dialog closes.
export const showConnectGitHubFlow = async (
  element: HTMLElement,
  api: MarketplaceApi,
  localize: LocalizeFunc
): Promise<boolean> => {
  let flowId: string;
  try {
    flowId = (await connectMarketplaceGitHub(api)).flow_id;
  } catch (err: unknown) {
    showAlertDialog(element, {
      title: localize("ui.panel.marketplace.dialog.error.title"),
      text: marketplaceErrorMessage(err, localize),
    });
    return false;
  }

  const flowFinished = await new Promise<boolean>((resolve) => {
    showConfigFlowDialog(element, {
      continueFlowId: flowId,
      dialogClosedCallback: (params) => resolve(params.flowFinished),
    });
  });

  // The dialog leaves continued flows running, but nobody else uses this one.
  if (!flowFinished) {
    deleteConfigFlow(api, flowId).catch(() => undefined);
    return false;
  }

  // A finished flow can also be an abort, so ask the backend.
  try {
    return (await fetchMarketplaceInfo(api)).github_connected;
  } catch {
    return false;
  }
};

// Opens the connect flow instead of adding a custom repository, returns
// whether adding can go ahead.
export const ensureGitHubConnected = (
  element: HTMLElement,
  api: MarketplaceApi,
  localize: LocalizeFunc,
  info: MarketplaceInfo
): boolean => {
  if (info.github_connected) {
    return true;
  }

  showConnectGitHubFlow(element, api, localize);
  return false;
};

// Covers adding a custom repository refused because GitHub got disconnected
// after the panel fetched its information, returns whether the error was
// handled.
export const handleGitHubNotConnected = (
  element: HTMLElement,
  api: MarketplaceApi,
  localize: LocalizeFunc,
  err: unknown
): boolean => {
  if (!isWebSocketError(err, ERROR_GITHUB_NOT_CONNECTED)) {
    return false;
  }

  showConnectGitHubFlow(element, api, localize);
  return true;
};

// Anonymous requests share a small hourly limit, connecting GitHub raises it.
// Returns whether the error was handled.
export const handleGitHubRateLimited = (
  element: HTMLElement,
  api: MarketplaceApi,
  localize: LocalizeFunc,
  err: unknown
): boolean => {
  if (!isWebSocketError(err, ERROR_GITHUB_RATE_LIMITED)) {
    return false;
  }

  showConfirmationDialog(element, {
    title: localize("ui.panel.marketplace.github.rate_limited_title"),
    text: localize("ui.panel.marketplace.github.rate_limited"),
    confirmText: localize("ui.panel.marketplace.github.connect"),
    dismissText: localize("ui.common.close"),
    confirm: () => {
      showConnectGitHubFlow(element, api, localize);
    },
  });
  return true;
};
