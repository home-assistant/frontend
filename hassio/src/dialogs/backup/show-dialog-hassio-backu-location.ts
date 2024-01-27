import { fireEvent } from "../../../../src/common/dom/fire_event";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";

export interface HassioBackupLocationDialogParams {
  supervisor: Supervisor;
}

export const showHassioBackupLocationDialog = (
  element: HTMLElement,
  dialogParams: HassioBackupLocationDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-hassio-backup-location",
    dialogImport: () => import("./dialog-hassio-backup-location"),
    dialogParams,
  });
};
