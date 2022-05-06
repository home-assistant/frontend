import { fireEvent } from "../../../common/dom/fire_event";

export const loadHardwareAvailableDialog = () =>
  import("./dialog-hardware-available");

export const showhardwareAvailableDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-hardware-available",
    dialogImport: loadHardwareAvailableDialog,
    dialogParams: {},
  });
};
