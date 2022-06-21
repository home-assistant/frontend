import { fireEvent } from "../../../../../common/dom/fire_event";
import { DeviceRegistryEntry } from "../../../../../data/device_registry";
import { ZWaveJSNodeFirmwareUpdateCapabilities } from "../../../../../data/zwave_js";

export interface ZWaveJSUpdateFirmwareNodeDialogParams {
  device: DeviceRegistryEntry;
  firmwareUpdateCapabilities: ZWaveJSNodeFirmwareUpdateCapabilities;
}

export const loadUpdateFirmwareNodeDialog = () =>
  import("./dialog-zwave_js-update-firmware-node");

export const showZWaveJUpdateFirmwareNodeDialog = (
  element: HTMLElement,
  updateFirmwareNodeDialogParams: ZWaveJSUpdateFirmwareNodeDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zwave_js-update-firmware-node",
    dialogImport: loadUpdateFirmwareNodeDialog,
    dialogParams: updateFirmwareNodeDialogParams,
  });
};
