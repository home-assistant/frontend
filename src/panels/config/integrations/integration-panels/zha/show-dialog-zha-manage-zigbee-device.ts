import { fireEvent } from "../../../../../common/dom/fire_event";
import { ZHADevice } from "../../../../../data/zha";

export type Tab = "clusters" | "bindings" | "signature" | "neighbors";

export interface ZHAManageZigbeeDeviceDialogParams {
  device: ZHADevice;
  tab?: Tab;
}

export const loadZHAManageZigbeeDeviceDialog = () =>
  import("./dialog-zha-manage-zigbee-device");

export const showZHAManageZigbeeDeviceDialog = (
  element: HTMLElement,
  params: ZHAManageZigbeeDeviceDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zha-manage-zigbee-device",
    dialogImport: loadZHAManageZigbeeDeviceDialog,
    dialogParams: params,
  });
};
