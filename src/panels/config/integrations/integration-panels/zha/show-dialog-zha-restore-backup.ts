import { fireEvent } from "../../../../../common/dom/fire_event";

export const loadZHARestoreBackupDialog = () =>
  import("./dialog-zha-restore-backup");

export const showZHARestoreBackupDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zha-restore-backup",
    dialogImport: loadZHARestoreBackupDialog,
    dialogParams: {},
  });
};
