import { fireEvent } from "../../../../src/common/dom/fire_event";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";

export interface HassioDatatiskDialogParams {
  supervisor: Supervisor;
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
