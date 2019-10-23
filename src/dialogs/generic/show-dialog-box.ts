import { fireEvent } from "../../common/dom/fire_event";

export interface DialogBoxParams {
  confirmation?: boolean;
  prompt?: boolean;
  confirmText?: string;
  dismissText?: string;
  inputLabel?: string;
  inputType?: string;
  text?: string;
  title?: string;
  cancel?: () => void;
  confirm?: (out?: string) => void;
}

export const loadGenericDialog = () =>
  import(/* webpackChunkName: "confirmation" */ "./dialog-box");

export const showDialog = (
  element: HTMLElement,
  dialogParams: DialogBoxParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-box",
    dialogImport: loadGenericDialog,
    dialogParams,
  });
};
