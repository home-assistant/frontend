import { fireEvent } from "../../../../../common/dom/fire_event";
import { ZHADevice } from "../../../../../data/zha";

export interface ZHAReconfigureDeviceDialogParams {
  device: ZHADevice;
}

export const loadZHAReconfigureDeviceDialog = () =>
  import("./dialog-zha-reconfigure-device");

export const showZHAReconfigureDeviceDialog = (
  element: HTMLElement,
  zhaReconfigureDeviceParams: ZHAReconfigureDeviceDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zha-reconfigure-device",
    dialogImport: loadZHAReconfigureDeviceDialog,
    dialogParams: zhaReconfigureDeviceParams,
  });
};
