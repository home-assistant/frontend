import { fireEvent } from "../../../../src/common/dom/fire_event";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";

export interface SupervisorDialogSupervisorCoreUpdateParams {
  supervisor: Supervisor;
}

export const showDialogSupervisorCoreUpdate = (
  element: HTMLElement,
  dialogParams: SupervisorDialogSupervisorCoreUpdateParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-supervisor-core-update",
    dialogImport: () => import("./dialog-supervisor-core-update"),
    dialogParams,
  });
};
