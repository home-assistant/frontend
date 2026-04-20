import { fireEvent } from "../../../../../common/dom/fire_event";
import type {
  ZwaveCredentialCapabilities,
  ZwaveCredential,
} from "../../../../../data/zwave_js-credentials";

export interface ZwaveCredentialEditDialogParams {
  device_id: string;
  capabilities: ZwaveCredentialCapabilities;
  user_index: number;
  user_label: string;
  credential?: ZwaveCredential;
  onSaved: () => void;
}

export const loadZwaveCredentialEditDialog = () =>
  import("./dialog-zwave_js-credential-edit");

export const showZwaveCredentialEditDialog = (
  element: HTMLElement,
  dialogParams: ZwaveCredentialEditDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zwave_js-credential-edit",
    dialogImport: loadZwaveCredentialEditDialog,
    dialogParams,
  });
};
