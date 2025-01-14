import { fireEvent } from "../../../../common/dom/fire_event";

export interface LocalBackupLocationDialogParams {}

export const showLocalBackupLocationDialog = (
  element: HTMLElement,
  dialogParams: LocalBackupLocationDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-local-backup-location",
    dialogImport: () => import("./dialog-local-backup-location"),
    dialogParams,
  });
};
