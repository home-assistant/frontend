import { fireEvent } from "../../../../common/dom/fire_event";

export interface CreateBackupDialogParams {
  submit?: (response: { slug: string }) => void;
  cancel?: () => void;
}

export const loadCreateBackupDialog = () => import("./dialog-create-backup");

export const showCreateBackupDialog = (
  element: HTMLElement,
  params: CreateBackupDialogParams
) =>
  new Promise<{ slug: string } | null>((resolve) => {
    const origCancel = params.cancel;
    const origSubmit = params.submit;
    fireEvent(element, "show-dialog", {
      dialogTag: "ha-dialog-create-backup",
      dialogImport: loadCreateBackupDialog,
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
