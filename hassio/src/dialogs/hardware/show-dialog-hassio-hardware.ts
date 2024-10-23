import { fireEvent } from "../../../../src/common/dom/fire_event";
import type { HassioHardwareInfo } from "../../../../src/data/hassio/hardware";
import type { Supervisor } from "../../../../src/data/supervisor/supervisor";

export interface HassioHardwareDialogParams {
  supervisor: Supervisor;
  hardware: HassioHardwareInfo;
}

export const showHassioHardwareDialog = (
  element: HTMLElement,
  dialogParams: HassioHardwareDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-hassio-hardware",
    dialogImport: () => import("./dialog-hassio-hardware"),
    dialogParams,
  });
};
