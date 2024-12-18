import { fireEvent } from "../../../../common/dom/fire_event";
import type { GenerateBackupParams } from "../../../../data/backup";

export interface GenerateBackupDialogParams {
  submit?: (response: GenerateBackupParams) => void;
  cancel?: () => void;
}

export const loadGenerateBackupDialog = () =>
  import("./dialog-generate-backup");

export const showGenerateBackupDialog = (
  element: HTMLElement,
  params: GenerateBackupDialogParams
) =>
  new Promise<GenerateBackupParams | null>((resolve) => {
    const origCancel = params.cancel;
    const origSubmit = params.submit;
    fireEvent(element, "show-dialog", {
      dialogTag: "ha-dialog-generate-backup",
      dialogImport: loadGenerateBackupDialog,
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
