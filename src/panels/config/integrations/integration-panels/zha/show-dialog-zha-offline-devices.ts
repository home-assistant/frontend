import { fireEvent } from "../../../../../common/dom/fire_event";

export const loadZHAOfflineDevicesDialog = () =>
  import("./dialog-zha-offline-devices");

export const showZHAOfflineDevicesDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zha-offline-devices",
    dialogImport: loadZHAOfflineDevicesDialog,
    dialogParams: {},
  });
};
