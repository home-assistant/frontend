import { fireEvent } from "../../../../common/dom/fire_event";
import type {
  BackupContentExtended,
  BackupData,
} from "../../../../data/backup";

export interface RestoreBackupDialogParams {
  backup: BackupContentExtended;
  selectedData: BackupData;
}

export const loadRestoreBackupDialog = () => import("./dialog-restore-backup");

export const showRestoreBackupDialog = (
  element: HTMLElement,
  params: RestoreBackupDialogParams
) => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-restore-backup",
    dialogImport: loadRestoreBackupDialog,
    dialogParams: params,
  });
};
