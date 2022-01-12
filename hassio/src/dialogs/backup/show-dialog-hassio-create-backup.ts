import { fireEvent } from "../../../../src/common/dom/fire_event";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";

export interface HassioCreateBackupDialogParams {
  supervisor: Supervisor;
  onCreate: () => void;
}

export const showHassioCreateBackupDialog = (
  element: HTMLElement,
  dialogParams: HassioCreateBackupDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-hassio-create-backup",
    dialogImport: () => import("./dialog-hassio-create-backup"),
    dialogParams,
  });
};
