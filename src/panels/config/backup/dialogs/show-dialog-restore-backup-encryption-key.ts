import { fireEvent } from "../../../../common/dom/fire_event";

export interface RestoreBackupEncryptionKeyDialogParams {
  submit?: (value: string) => void;
  cancel?: () => void;
}

export const loadRestoreBackupEncryptionKeyDialog = () =>
  import("./dialog-restore-backup-encryption-key");

export const showRestoreBackupEncryptionKeyDialog = (
  element: HTMLElement,
  params: RestoreBackupEncryptionKeyDialogParams
) =>
  new Promise<string | null>((resolve) => {
    const origCancel = params.cancel;
    const origSubmit = params.submit;
    fireEvent(element, "show-dialog", {
      dialogTag: "ha-dialog-restore-backup-encryption-key",
      dialogImport: loadRestoreBackupEncryptionKeyDialog,
      dialogParams: {
        ...params,
        cancel: () => {
          resolve(null);
          if (origCancel) {
            origCancel();
          }
        },
        submit: (response) => {
          resolve(response);
          if (origSubmit) {
            origSubmit(response);
          }
        },
      },
    });
  });
