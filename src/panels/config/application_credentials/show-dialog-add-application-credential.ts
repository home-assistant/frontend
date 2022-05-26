import { fireEvent } from "../../../common/dom/fire_event";
import { ApplicationCredential } from "../../../data/application_credential";

export interface AddApplicationCredentialDialogParams {
  applicationCredentialAddedCallback: (
    applicationCredential: ApplicationCredential
  ) => void;
  dialogAbortedCallback?: () => void;
  selectedDomain?: string;
}

export const loadAddApplicationCredentialDialog = () =>
  import("./dialog-add-application-credential");

export const showAddApplicationCredentialDialog = (
  element: HTMLElement,
  dialogParams: AddApplicationCredentialDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-add-application-credential",
    dialogImport: loadAddApplicationCredentialDialog,
    dialogParams,
  });
};
