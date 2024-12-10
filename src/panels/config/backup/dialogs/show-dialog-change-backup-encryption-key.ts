import { fireEvent } from "../../../../common/dom/fire_event";

export interface ChangeBackupEncryptionKeyDialogParams {
  currentKey: string;
  submit?: (success: boolean) => void;
  cancel?: () => void;
  saveKey: (key: string) => any;
}

const loadDialog = () => import("./dialog-change-backup-encryption-key");

export const showChangeBackupEncryptionKeyDialog = (
  element: HTMLElement,
  params?: ChangeBackupEncryptionKeyDialogParams
) =>
  new Promise<boolean>((resolve) => {
    const origCancel = params?.cancel;
    const origSubmit = params?.submit;
    fireEvent(element, "show-dialog", {
      dialogTag: "ha-dialog-change-backup-encryption-key",
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
