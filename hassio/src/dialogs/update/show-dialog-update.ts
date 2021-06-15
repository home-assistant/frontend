import { fireEvent } from "../../../../src/common/dom/fire_event";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";

export interface SupervisorDialogSupervisorUpdateParams {
  supervisor: Supervisor;
  name: string;
  version: string;
  snapshotParams: any;
  element: HTMLElement;
  updateHandler: () => Promise<void>;
}

export const showDialogSupervisorUpdate = (
  element: HTMLElement,
  dialogParams: Partial<SupervisorDialogSupervisorUpdateParams>
): void => {
  dialogParams.element = element;
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-supervisor-update",
    dialogImport: () => import("./dialog-supervisor-update"),
    dialogParams,
  });
};
