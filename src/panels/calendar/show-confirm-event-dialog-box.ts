import { TemplateResult } from "lit";
import { fireEvent } from "../../common/dom/fire_event";

export interface ConfirmEventDialogBoxParams {
  confirmText?: string;
  confirm?: () => void;
  confirmFutureText?: string; // Prompt for future recurring events
  confirmFuture?: () => void;
  cancel?: () => void;
  text?: string | TemplateResult;
  title: string;
  destructive: boolean;
}

export const loadGenericDialog = () => import("./confirm-event-dialog-box");

export const showConfirmEventDialog = (
  element: HTMLElement,
  dialogParams: ConfirmEventDialogBoxParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "confirm-event-dialog-box",
    dialogImport: loadGenericDialog,
    dialogParams: dialogParams,
    addHistory: false,
  });
};
