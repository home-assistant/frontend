import { fireEvent } from "../../../../common/dom/fire_event";

export interface SetBackupEncryptionKeyDialogParams {
  submit?: (key: boolean) => void;
  cancel?: () => void;
  saveKey: (key: string) => any;
}

const loadDialog = () => import("./dialog-set-backup-encryption-key");

export const showSetBackupEncryptionKeyDialog = (
  element: HTMLElement,
  params?: SetBackupEncryptionKeyDialogParams
) =>
  new Promise<boolean>((resolve) => {
    const origCancel = params?.cancel;
    const origSubmit = params?.submit;
    fireEvent(element, "show-dialog", {
      dialogTag: "ha-dialog-set-backup-encryption-key",
      dialogImport: loadDialog,
      dialogParams: {
        ...params,
        cancel: () => {
          resolve(false);
          if (origCancel) {
            origCancel();
          }
        },
        submit: (value) => {
          resolve(value);
          if (origSubmit) {
            origSubmit(value);
          }
        },
      },
    });
  });
