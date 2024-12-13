import { fireEvent } from "../../../../common/dom/fire_event";

export interface UploadBackupDialogParams {
  submit?: () => void;
  cancel?: () => void;
}

export const loadUploadBackupDialog = () => import("./dialog-upload-backup");

export const showUploadBackupDialog = (
  element: HTMLElement,
  params: UploadBackupDialogParams
) =>
  new Promise<void | null>((resolve) => {
    const origCancel = params.cancel;
    const origSubmit = params.submit;
    fireEvent(element, "show-dialog", {
      dialogTag: "ha-dialog-upload-backup",
      dialogImport: loadUploadBackupDialog,
      dialogParams: {
        ...params,
        cancel: () => {
          resolve(null);
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
