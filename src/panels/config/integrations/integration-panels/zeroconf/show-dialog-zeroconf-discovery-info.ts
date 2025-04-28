import { fireEvent } from "../../../../../common/dom/fire_event";
import type { ZeroconfDiscoveryData } from "../../../../../data/zeroconf";

export interface ZeroconfDiscoveryInfoDialogParams {
  entry: ZeroconfDiscoveryData;
}

export const loadZeroconfDiscoveryInfoDialog = () =>
  import("./dialog-zeroconf-discovery-info");

export const showZeroconfDiscoveryInfoDialog = (
  element: HTMLElement,
  zeroconfDiscoveryInfoDialogParams: ZeroconfDiscoveryInfoDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zeroconf-device-info",
    dialogImport: loadZeroconfDiscoveryInfoDialog,
    dialogParams: zeroconfDiscoveryInfoDialogParams,
  });
};
