import { fireEvent } from "../../common/dom/fire_event";

interface BaseDialogParams {
  confirmText?: string;
  text?: string;
  title?: string;
}

export interface AlertDialogParams extends BaseDialogParams {
  confirm?: () => void;
}

export interface ConfirmationDialogParams extends BaseDialogParams {
  dismissText?: string;
  confirm?: () => void;
  cancel?: () => void;
}

export interface PromptDialogParams extends BaseDialogParams {
  inputLabel?: string;
  inputType?: string;
  defaultValue?: string;
  confirm?: (out?: string) => void;
}

export interface DialogParams
  extends ConfirmationDialogParams,
    PromptDialogParams {
  confirm?: (out?: string) => void;
  confirmation?: boolean;
  prompt?: boolean;
}

export const loadGenericDialog = () =>
  import(/* webpackChunkName: "confirmation" */ "./dialog-box");

const showDialogHelper = (
  element: HTMLElement,
  dialogParams: DialogParams,
  extra?: {
    confirmation?: DialogParams["confirmation"];
    prompt?: DialogParams["prompt"];
  }
) =>
  new Promise((resolve) => {
    const origCancel = dialogParams.cancel;
    const origConfirm = dialogParams.confirm;

    fireEvent(element, "show-dialog", {
      dialogTag: "dialog-box",
      dialogImport: loadGenericDialog,
      dialogParams: {
        ...dialogParams,
        ...extra,
        cancel: () => {
          resolve(extra?.prompt ? null : false);
          if (origCancel) {
            origCancel();
          }
        },
        confirm: (out) => {
          resolve(extra?.prompt ? out : true);
          if (origConfirm) {
            origConfirm(out);
          }
        },
      },
    });
  });

export const showAlertDialog = (
  element: HTMLElement,
  dialogParams: AlertDialogParams
) => showDialogHelper(element, dialogParams);

export const showConfirmationDialog = (
  element: HTMLElement,
  dialogParams: ConfirmationDialogParams
) =>
  showDialogHelper(element, dialogParams, { confirmation: true }) as Promise<
    boolean
  >;

export const showPromptDialog = (
  element: HTMLElement,
  dialogParams: PromptDialogParams
) =>
  showDialogHelper(element, dialogParams, { prompt: true }) as Promise<
    null | string
  >;
