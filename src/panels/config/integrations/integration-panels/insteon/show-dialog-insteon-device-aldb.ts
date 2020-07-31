import { fireEvent } from "../../../../../common/dom/fire_event";
import { InsteonDevice, ALDBRecord } from "../../../../../data/insteon";

export interface InsteonDeviceALDBDialogParams {
  aldb_status: string;
  aldb: ALDBRecord[];
}

export const loadInsteonDeviceALDBDialog = () =>
  import(
    /* webpackChunkName: "dialog-insteon-device-aldb" */ "./dialog-insteon-device-aldb"
  );

export const showInsteonDeviceALDBDialog = (
  element: HTMLElement,
  insteonDeviceALDBParams: InsteonDeviceALDBDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-insteon-device-aldb",
    dialogImport: loadInsteonDeviceALDBDialog,
    dialogParams: insteonDeviceALDBParams,
  });
};
