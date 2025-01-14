import { fireEvent } from "../../../../common/dom/fire_event";

export interface ShowBackupEncryptionKeyDialogParams {
  currentKey: string;
}

const loadDialog = () => import("./dialog-show-backup-encryption-key");

export const showShowBackupEncryptionKeyDialog = (
  element: HTMLElement,
  params?: ShowBackupEncryptionKeyDialogParams
) =>
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-show-backup-encryption-key",
    dialogImport: loadDialog,
    dialogParams: params,
  });
