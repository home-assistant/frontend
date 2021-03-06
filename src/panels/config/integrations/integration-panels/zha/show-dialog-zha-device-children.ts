import { fireEvent } from "../../../../../common/dom/fire_event";
import { ZHADevice } from "../../../../../data/zha";

export interface ZHADeviceChildrenDialogParams {
  device: ZHADevice;
}

export const loadZHADeviceChildrenDialog = () =>
  import("./dialog-zha-device-children");

export const showZHADeviceChildrenDialog = (
  element: HTMLElement,
  zhaDeviceChildrenParams: ZHADeviceChildrenDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zha-device-children",
    dialogImport: loadZHADeviceChildrenDialog,
    dialogParams: zhaDeviceChildrenParams,
  });
};
