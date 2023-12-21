import { fireEvent } from "../../common/dom/fire_event";

export interface UpdateBackupDialogParams {
  submit?: (response: boolean) => void;
  cancel?: () => void;
}

export const showUpdateBackupDialogParams = (
  element: HTMLElement,
  dialogParams: UpdateBackupDialogParams
) =>
  new Promise<boolean | null>((resolve) => {
    const origCancel = dialogParams.cancel;
    const origSubmit = dialogParams.submit;

    fireEvent(element, "show-dialog", {
      dialogTag: "dialog-update-backup",
      dialogImport: () => import("./dialog-update-backup"),
      dialogParams: {
        ...dialogParams,
        cancel: () => {
          resolve(null);
          if (origCancel) {
            origCancel();
          }
        },
        submit: (response: boolean) => {
          resolve(response);
          if (origSubmit) {
            origSubmit(response);
          }
        },
      },
    });
  });
