import { fireEvent } from "../../../../common/dom/fire_event";
import type { DeviceRegistryEntry } from "../../../../data/device/device_registry";

export interface DeviceAddToDialogParams {
  device: DeviceRegistryEntry;
  newTriggersConditions: boolean;
  entityIds: string[];
}

export const loadDeviceAddToDialog = () => import("./ha-device-add-to-dialog");

export const showDeviceAddToDialog = (
  element: HTMLElement,
  params: DeviceAddToDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-device-add-to",
    dialogImport: loadDeviceAddToDialog,
    dialogParams: params,
  });
};
