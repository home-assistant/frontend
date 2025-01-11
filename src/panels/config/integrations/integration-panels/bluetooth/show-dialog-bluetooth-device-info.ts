import { fireEvent } from "../../../../../common/dom/fire_event";
import type { BluetoothDeviceData } from "../../../../../data/bluetooth";

export interface BluetoothDeviceInfoDialogParams {
  entry: BluetoothDeviceData;
}

export const loadBluetoothDeviceInfoDialog = () =>
  import("./dialog-bluetooth-device-info");

export const showBluetoothDeviceInfoDialog = (
  element: HTMLElement,
  bluetoothDeviceInfoDialogParams: BluetoothDeviceInfoDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-bluetooth-device-info",
    dialogImport: loadBluetoothDeviceInfoDialog,
    dialogParams: bluetoothDeviceInfoDialogParams,
  });
};
