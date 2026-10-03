import { fireEvent } from "../../../../../common/dom/fire_event";

export interface ESPHomeEncryptionKeyDialogParams {
  entry_id: string;
  encryption_key: string;
}

export const loadESPHomeEncryptionKeyDialog = () =>
  import("./dialog-esphome-encryption-key");

export const showESPHomeEncryptionKeyDialog = (
  element: HTMLElement,
  dialogParams: ESPHomeEncryptionKeyDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-esphome-encryption-key",
    dialogImport: loadESPHomeEncryptionKeyDialog,
    dialogParams,
  });
};
