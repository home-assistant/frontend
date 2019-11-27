import { fireEvent } from "../../common/dom/fire_event";
import {
  DeviceRegistryEntry,
  DeviceRegistryEntryMutableParams,
} from "../../data/device_registry";

export interface DeviceRegistryDetailDialogParams {
  device: DeviceRegistryEntry;
  updateEntry: (
    updates: Partial<DeviceRegistryEntryMutableParams>
  ) => Promise<unknown>;
}

export const loadDeviceRegistryDetailDialog = () =>
  import(
    /* webpackChunkName: "device-registry-detail-dialog" */ "./dialog-device-registry-detail"
  );

export const showDeviceRegistryDetailDialog = (
  element: HTMLElement,
  deviceRegistryDetailParams: DeviceRegistryDetailDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-device-registry-detail",
    dialogImport: loadDeviceRegistryDetailDialog,
    dialogParams: deviceRegistryDetailParams,
  });
};
