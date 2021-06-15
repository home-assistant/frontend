import { fireEvent } from "../../../../src/common/dom/fire_event";
import { HassioPartialSnapshotCreateParams } from "../../../../src/data/hassio/snapshot";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";

export interface SupervisorDialogSupervisorUpdateParams {
  supervisor: Supervisor;
  name: string;
  version: string;
  snapshotParams: HassioPartialSnapshotCreateParams;
  updateHandler: () => Promise<void>;
}

export const showDialogSupervisorUpdate = (
  element: HTMLElement,
  dialogParams: Partial<SupervisorDialogSupervisorUpdateParams>
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-supervisor-update",
    dialogImport: () => import("./dialog-supervisor-update"),
    dialogParams,
  });
};
