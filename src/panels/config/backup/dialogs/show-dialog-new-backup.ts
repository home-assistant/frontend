import { fireEvent } from "../../../../common/dom/fire_event";
import type { BackupConfig } from "../../../../data/backup";

export type NewBackupType = "default" | "custom";

export interface NewBackupDialogParams {
  config: BackupConfig;
  submit?: (type: NewBackupType) => void;
  cancel?: () => void;
}

export const loadNewBackupDialog = () => import("./dialog-new-backup");

export const showNewBackupDialog = (
  element: HTMLElement,
  params: NewBackupDialogParams
) =>
  new Promise<NewBackupType | null>((resolve) => {
    const origCancel = params.cancel;
    const origSubmit = params.submit;
    fireEvent(element, "show-dialog", {
      dialogTag: "ha-dialog-new-backup",
      dialogImport: loadNewBackupDialog,
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
