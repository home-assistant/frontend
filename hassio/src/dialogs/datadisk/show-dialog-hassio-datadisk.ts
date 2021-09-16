import { fireEvent } from "../../../../src/common/dom/fire_event";
import { HassioHardwareInfo } from "../../../../src/data/hassio/hardware";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";

export interface HassioDatatiskDialogParams {
  supervisor: Supervisor;
  hardware: HassioHardwareInfo;
}

export const showHassioDatadiskDialog = (
  element: HTMLElement,
  dialogParams: HassioDatatiskDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-hassio-datadisk",
    dialogImport: () => import("./dialog-hassio-datadisk"),
    dialogParams,
  });
};
