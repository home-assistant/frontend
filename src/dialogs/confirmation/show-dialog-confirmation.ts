import { fireEvent } from "../../common/dom/fire_event";

export interface ConfirmationDialogParams {
  title?: string;
  text: string;
  confirm: () => void;
}

export const loadConfirmationDialog = () =>
  import(/* webpackChunkName: "confirmation" */ "./dialog-confirmation");

export const showConfirmationDialog = (
  element: HTMLElement,
  systemLogDetailParams: ConfirmationDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-confirmation",
    dialogImport: loadConfirmationDialog,
    dialogParams: systemLogDetailParams,
  });
};
