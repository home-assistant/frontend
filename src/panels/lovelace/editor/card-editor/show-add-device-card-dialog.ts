import { fireEvent } from "../../../../common/dom/fire_event";
import type { AddToViewCardDialogParams } from "../add-entities-to-view";

export interface AddDeviceCardDialogParams extends AddToViewCardDialogParams {
  deviceId: string;
}

const importAddDeviceCardDialog = () => import("./hui-dialog-add-device-card");

export const showAddDeviceCardDialog = (
  element: HTMLElement,
  addDeviceCardDialogParams: AddDeviceCardDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-add-device-card",
    dialogImport: importAddDeviceCardDialog,
    dialogParams: addDeviceCardDialogParams,
  });
};
