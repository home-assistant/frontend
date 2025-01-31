import { fireEvent } from "../../../../common/dom/fire_event";
import type { BackupContent } from "../../../../data/backup";

export interface DownloadDecryptedBackupDialogParams {
  backup: BackupContent;
  agentId?: string;
}

export const loadDownloadDecryptedBackupDialog = () =>
  import("./dialog-download-decrypted-backup");

export const showDownloadDecryptedBackupDialog = (
  element: HTMLElement,
  params: DownloadDecryptedBackupDialogParams
) => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-download-decrypted-backup",
    dialogImport: loadDownloadDecryptedBackupDialog,
    dialogParams: params,
  });
};
