import { fireEvent } from "../../../../../common/dom/fire_event";
import { DeviceRegistryEntry } from "../../../../../data/device_registry";

export interface ZWaveJSHealNodeDialogParams {
  device: DeviceRegistryEntry;
}

export const loadHealNodeDialog = () => import("./dialog-zwave_js-heal-node");

export const showZWaveJSHealNodeDialog = (
  element: HTMLElement,
  healNodeDialogParams: ZWaveJSHealNodeDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zwave_js-heal-node",
    dialogImport: loadHealNodeDialog,
    dialogParams: healNodeDialogParams,
  });
};
