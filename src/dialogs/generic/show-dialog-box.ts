import { fireEvent } from "../../common/dom/fire_event";

interface AlertDialogParams {
  confirmText?: string;
  text?: string;
  title?: string;
  confirm?: (out?: string) => void;
}

interface ConfirmationDialogParams extends AlertDialogParams {
  dismissText?: string;
  cancel?: () => void;
}

interface PromptDialogParams extends AlertDialogParams {
  inputLabel?: string;
  inputType?: string;
  defaultValue?: string;
}

export interface DialogParams
  extends ConfirmationDialogParams,
    PromptDialogParams {
  confirmation?: boolean;
  prompt?: boolean;
}

export const loadGenericDialog = () =>
  import(/* webpackChunkName: "confirmation" */ "./dialog-box");

export const showAlertDialog = (
  element: HTMLElement,
  dialogParams: AlertDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-box",
    dialogImport: loadGenericDialog,
    dialogParams,
  });
};

export const showConfirmationDialog = (
  element: HTMLElement,
  dialogParams: ConfirmationDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-box",
    dialogImport: loadGenericDialog,
    dialogParams: { ...dialogParams, confirmation: true },
  });
};

export const showPromptDialog = (
  element: HTMLElement,
  dialogParams: PromptDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-box",
    dialogImport: loadGenericDialog,
    dialogParams: { ...dialogParams, prompt: true },
  });
};
