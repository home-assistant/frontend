import { fireEvent } from "../../../../common/dom/fire_event";
import type { BackupContent } from "../../../../data/backup";

export interface DownloadDecryptedBackupDialogParams {
  backup: BackupContent;
  agentId?: string;
  submit?: () => void;
  cancel?: () => void;
}

export const loadDownloadDecryptedBackupDialog = () =>
  import("./dialog-download-decrypted-backup");

export const showDownloadDecryptedBackupDialog = (
  element: HTMLElement,
  params: DownloadDecryptedBackupDialogParams
) =>
  new Promise<void>((resolve) => {
    const origCancel = params.cancel;
    const origSubmit = params.submit;
    fireEvent(element, "show-dialog", {
      dialogTag: "ha-dialog-download-decrypted-backup",
      dialogImport: loadDownloadDecryptedBackupDialog,
      dialogParams: {
        ...params,
        cancel: () => {
          resolve();
          if (origCancel) {
            origCancel();
          }
        },
        submit: () => {
          resolve();
          if (origSubmit) {
            origSubmit();
          }
        },
      },
    });
  });
