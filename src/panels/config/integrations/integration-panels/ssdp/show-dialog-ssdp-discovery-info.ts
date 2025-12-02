import { fireEvent } from "../../../../../common/dom/fire_event";
import type { SSDPDiscoveryData } from "../../../../../data/ssdp";

export interface SSDPDiscoveryInfoDialogParams {
  entry: SSDPDiscoveryData;
}

export const loadSSDPDiscoveryInfoDialog = () =>
  import("./dialog-ssdp-discovery-info");

export const showSSDPDiscoveryInfoDialog = (
  element: HTMLElement,
  ssdpDiscoveryInfoDialogParams: SSDPDiscoveryInfoDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-ssdp-device-info",
    dialogImport: loadSSDPDiscoveryInfoDialog,
    dialogParams: ssdpDiscoveryInfoDialogParams,
  });
};
