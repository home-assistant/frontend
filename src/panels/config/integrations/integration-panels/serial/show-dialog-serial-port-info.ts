import { fireEvent } from "../../../../../common/dom/fire_event";
import type { SerialPortWithConsumers } from "../../../../../data/usb";

export interface SerialPortInfoDialogParams {
  port: SerialPortWithConsumers;
}

export const loadSerialPortInfoDialog = () =>
  import("./dialog-serial-port-info");

export const showSerialPortInfoDialog = (
  element: HTMLElement,
  serialPortInfoDialogParams: SerialPortInfoDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-serial-port-info",
    dialogImport: loadSerialPortInfoDialog,
    dialogParams: serialPortInfoDialogParams,
  });
};
