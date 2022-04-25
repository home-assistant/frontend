import { fireEvent } from "../../../common/dom/fire_event";
import type { HassioHardwareInfo } from "../../../data/hassio/hardware";

export interface HardwareAvailableDialogParams {
  hardware: HassioHardwareInfo;
}

export const loadHardwareAvailableDialog = () =>
  import("./dialog-hardware-available");

export const showhardwareAvailableDialog = (
  element: HTMLElement,
  dialogParams: HardwareAvailableDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-hardware-available",
    dialogImport: loadHardwareAvailableDialog,
    dialogParams,
  });
};
