import { fireEvent } from "../../../../../common/dom/fire_event";
import type {
  ZwaveCredentialCapabilities,
  ZwaveUser,
} from "../../../../../data/zwave_js-credentials";

export interface ZwaveCredentialUserEditDialogParams {
  device_id: string;
  capabilities: ZwaveCredentialCapabilities;
  user?: ZwaveUser;
  onSaved: () => void;
}

export const loadZwaveCredentialUserEditDialog = () =>
  import("./dialog-zwave_js-credential-user-edit");

export const showZwaveCredentialUserEditDialog = (
  element: HTMLElement,
  dialogParams: ZwaveCredentialUserEditDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zwave_js-credential-user-edit",
    dialogImport: loadZwaveCredentialUserEditDialog,
    dialogParams,
  });
};
