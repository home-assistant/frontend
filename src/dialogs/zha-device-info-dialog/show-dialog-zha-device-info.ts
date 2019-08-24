import { fireEvent } from "../../common/dom/fire_event";

export interface ZHADeviceInfoDialogParams {
  ieee: string;
}

export const loadZHADeviceInfoDialog = () =>
  import(/* webpackChunkName: "device-zha-device-info" */ "./dialog-zha-device-info");

export const showDeviceRegistryDetailDialog = (
  element: HTMLElement,
  zhaDeviceInfoParams: ZHADeviceInfoDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zha-device-info",
    dialogImport: loadZHADeviceInfoDialog,
    dialogParams: zhaDeviceInfoParams,
  });
};
