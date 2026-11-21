import { fireEvent } from "../../../../../common/dom/fire_event";

export interface MatterAddDeviceDialogParams {
  /** Bluetooth discovery flow to commission through, if any. */
  discoveryFlowId?: string;
}

export const loadAddDeviceDialog = () => import("./dialog-matter-add-device");

export const showMatterAddDeviceDialog = (
  element: HTMLElement,
  dialogParams: MatterAddDeviceDialogParams = {}
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-matter-add-device",
    dialogImport: loadAddDeviceDialog,
    dialogParams,
  });
};
