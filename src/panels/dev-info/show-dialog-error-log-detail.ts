import { fireEvent } from "../../common/dom/fire_event";
import { LoggedError } from "../../data/error_log";

declare global {
  // for fire event
  interface HASSDomEvents {
    "show-dialog-error-log-detail": ErrorLogDetailDialogParams;
  }
}

let registeredDialog = false;
const dialogShowEvent = "show-dialog-error-log-detail";
const dialogTag = "dialog-error-log-detail";

export interface ErrorLogDetailDialogParams {
  item: LoggedError;
}

const registerDialog = (element: HTMLElement) =>
  fireEvent(element, "register-dialog", {
    dialogShowEvent,
    dialogTag,
    dialogImport: () =>
      import(/* webpackChunkName: "error-log-detail-dialog" */ "./dialog-error-log-detail"),
  });

export const showErrorLogDetailDialog = (
  element: HTMLElement,
  systemLogDetailParams: ErrorLogDetailDialogParams
): void => {
  if (!registeredDialog) {
    registeredDialog = true;
    registerDialog(element);
  }
  fireEvent(element, dialogShowEvent, systemLogDetailParams);
};
