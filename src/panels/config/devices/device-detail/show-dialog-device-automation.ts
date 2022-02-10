import { fireEvent } from "../../../../common/dom/fire_event";
import { DeviceRegistryEntry } from "../../../../data/device_registry";

export interface DeviceAutomationDialogParams {
  device: DeviceRegistryEntry;
  script?: boolean;
}

export const loadDeviceAutomationDialog = () =>
  import("./ha-device-automation-dialog");

export const showDeviceAutomationDialog = (
  element: HTMLElement,
  detailParams: DeviceAutomationDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-device-automation",
    dialogImport: loadDeviceAutomationDialog,
    dialogParams: detailParams,
  });
};
