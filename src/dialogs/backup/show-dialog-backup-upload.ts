import { fireEvent } from "../../common/dom/fire_event";
import "./dialog-backup-upload";

export interface BackupUploadDialogParams {
  onUploadComplete: () => void;
}

export const showBackupUploadDialog = (
  element: HTMLElement,
  dialogParams: BackupUploadDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-backup-upload",
    dialogImport: () => import("./dialog-backup-upload"),
    dialogParams,
  });
};
