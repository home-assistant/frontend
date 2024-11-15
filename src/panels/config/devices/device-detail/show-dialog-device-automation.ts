import { fireEvent } from "../../../../common/dom/fire_event";
import type { DeviceRegistryEntry } from "../../../../data/device_registry";
import type { EntityRegistryEntry } from "../../../../data/entity_registry";

export interface DeviceAutomationDialogParams {
  device: DeviceRegistryEntry;
  entityReg: EntityRegistryEntry[];
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
