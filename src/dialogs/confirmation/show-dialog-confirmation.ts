import { fireEvent } from "../../common/dom/fire_event";

export interface ConfirmationDialogParams {
  title?: string;
  text: string;
  confirm: () => Promise<boolean>;
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
