import { fireEvent } from "../../../../common/dom/fire_event";

export interface ChangeBackupEncryptionKeyDialogParams {
  currentKey?: string;
  submit?: (key: string) => void;
  cancel?: () => void;
}

const loadDialog = () => import("./dialog-change-backup-encryption-key");

export const showChangeBackupEncryptionKeyDialog = (
  element: HTMLElement,
  params?: ChangeBackupEncryptionKeyDialogParams
) =>
  new Promise<string | null>((resolve) => {
    const origCancel = params?.cancel;
    const origSubmit = params?.submit;
    fireEvent(element, "show-dialog", {
      dialogTag: "ha-dialog-change-backup-encryption-key",
      dialogImport: loadDialog,
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
