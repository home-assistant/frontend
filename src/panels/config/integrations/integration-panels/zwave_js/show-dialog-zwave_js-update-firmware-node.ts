import { fireEvent } from "../../../../../common/dom/fire_event";
import { DeviceRegistryEntry } from "../../../../../data/device_registry";

export interface ZWaveJSUpdateFirmwareNodeDialogParams {
  device: DeviceRegistryEntry;
}

export const loadUpdateFirmwareNodeDialog = () =>
  import("./dialog-zwave_js-update-firmware-node");

export const showZWaveJSUpdateFirmwareNodeDialog = (
  element: HTMLElement,
  updateFirmwareNodeDialogParams: ZWaveJSUpdateFirmwareNodeDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zwave_js-update-firmware-node",
    dialogImport: loadUpdateFirmwareNodeDialog,
    dialogParams: updateFirmwareNodeDialogParams,
  });
};
