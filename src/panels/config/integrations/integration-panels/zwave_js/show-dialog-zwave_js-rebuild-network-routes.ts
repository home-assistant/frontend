import { fireEvent } from "../../../../../common/dom/fire_event";

export interface ZWaveJSRebuildNetworkRoutesDialogParams {
  entry_id: string;
}

export const loadRebuildNetworkRoutesDialog = () =>
  import("./dialog-zwave_js-rebuild-network-routes");

export const showZWaveJSRebuildNetworkRoutesDialog = (
  element: HTMLElement,
  rebuildNetworkRoutesDialogParams: ZWaveJSRebuildNetworkRoutesDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zwave_js-rebuild-network-routes",
    dialogImport: loadRebuildNetworkRoutesDialog,
    dialogParams: rebuildNetworkRoutesDialogParams,
  });
};
