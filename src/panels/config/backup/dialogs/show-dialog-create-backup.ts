import { fireEvent } from "../../../../common/dom/fire_event";

export interface CreateBackupDialogParams {}

export const loadCreateBackupDialog = () => import("./dialog-create-backup");

export const showCreateBackupDialog = (
  element: HTMLElement,
  params: CreateBackupDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-create-backup",
    dialogImport: loadCreateBackupDialog,
    dialogParams: params,
  });
};
