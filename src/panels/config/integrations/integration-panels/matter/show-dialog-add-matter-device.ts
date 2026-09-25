import { fireEvent } from "../../../../../common/dom/fire_event";

export const loadAddDeviceDialog = () => import("./dialog-matter-add-device");

export const showMatterAddDeviceDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-matter-add-device",
    dialogImport: loadAddDeviceDialog,
    dialogParams: {},
  });
};
