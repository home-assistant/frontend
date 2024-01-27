import { TemplateResult } from "lit";
import { fireEvent } from "../../common/dom/fire_event";

interface BaseDialogBoxParams {
  confirmText?: string;
  text?: string | TemplateResult;
  title?: string;
  warning?: boolean;
}

export interface AlertDialogParams extends BaseDialogBoxParams {
  confirm?: () => void;
}

export interface ConfirmationDialogParams extends BaseDialogBoxParams {
  dismissText?: string;
  confirm?: () => void;
  cancel?: () => void;
  destructive?: boolean;
}

export interface PromptDialogParams extends BaseDialogBoxParams {
  inputLabel?: string;
  inputType?: string;
  defaultValue?: string;
  placeholder?: string;
  confirm?: (out?: string) => void;
  cancel?: () => void;
  inputMin?: number | string;
  inputMax?: number | string;
}

export interface DialogBoxParams
  extends ConfirmationDialogParams,
    PromptDialogParams {
  confirm?: (out?: string) => void;
  confirmation?: boolean;
  prompt?: boolean;
}

export const loadGenericDialog = () => import("./dialog-box");

const showDialogHelper = (
  element: HTMLElement,
  dialogParams: DialogBoxParams,
  extra?: {
    confirmation?: DialogBoxParams["confirmation"];
    prompt?: DialogBoxParams["prompt"];
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
  showDialogHelper(element, dialogParams, {
    confirmation: true,
  }) as Promise<boolean>;

export const showPromptDialog = (
  element: HTMLElement,
  dialogParams: PromptDialogParams
) =>
  showDialogHelper(element, dialogParams, { prompt: true }) as Promise<
    null | string
  >;
