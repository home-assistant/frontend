import { fireEvent } from "../../../../../common/dom/fire_event";
import { DeviceRegistryEntry } from "../../../../../data/device_registry";

export interface ZWaveJSRebuildNodeRoutesDialogParams {
  device: DeviceRegistryEntry;
}

export const loadRebuildNodeRoutesDialog = () =>
  import("./dialog-zwave_js-rebuild-node-routes");

export const showZWaveJSRebuildNodeRoutesDialog = (
  element: HTMLElement,
  rebuildNodeRoutesDialogParams: ZWaveJSRebuildNodeRoutesDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zwave_js-rebuild-node-routes",
    dialogImport: loadRebuildNodeRoutesDialog,
    dialogParams: rebuildNodeRoutesDialogParams,
  });
};
