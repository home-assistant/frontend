import { fireEvent } from "../../../../common/dom/fire_event";

export interface ChangeBackupPasswordDialogParams {
  currentPassword?: string;
  submit?: (password: string) => void;
  cancel?: () => void;
}

const loadDialog = () => import("./dialog-change-backup-password");

export const showChangeBackupPasswordDialog = (
  element: HTMLElement,
  params?: ChangeBackupPasswordDialogParams
) =>
  new Promise<string | null>((resolve) => {
    const origCancel = params?.cancel;
    const origSubmit = params?.submit;
    fireEvent(element, "show-dialog", {
      dialogTag: "ha-dialog-change-backup-password",
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
