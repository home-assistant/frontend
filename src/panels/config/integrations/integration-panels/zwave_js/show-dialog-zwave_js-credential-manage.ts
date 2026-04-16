import { fireEvent } from "../../../../../common/dom/fire_event";

export interface ZwaveCredentialManageDialogParams {
  device_id: string;
}

export const loadZwaveCredentialManageDialog = () =>
  import("./dialog-zwave_js-credential-manage");

export const showZwaveCredentialManageDialog = (
  element: HTMLElement,
  dialogParams: ZwaveCredentialManageDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zwave_js-credential-manage",
    dialogImport: loadZwaveCredentialManageDialog,
    dialogParams,
  });
};
