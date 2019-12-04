import { fireEvent } from "../../../common/dom/fire_event";
import { LoggedError } from "../../../data/system_log";

declare global {
  // for fire event
  interface HASSDomEvents {
    "show-dialog-system-log-detail": SystemLogDetailDialogParams;
  }
}

let registeredDialog = false;
const dialogShowEvent = "show-dialog-system-log-detail";
const dialogTag = "dialog-system-log-detail";

export interface SystemLogDetailDialogParams {
  item: LoggedError;
}

const registerDialog = (element: HTMLElement) =>
  fireEvent(element, "register-dialog", {
    dialogShowEvent,
    dialogTag,
    dialogImport: () =>
      import(
        /* webpackChunkName: "system-log-detail-dialog" */ "./dialog-system-log-detail"
      ),
  });

export const showSystemLogDetailDialog = (
  element: HTMLElement,
  systemLogDetailParams: SystemLogDetailDialogParams
): void => {
  if (!registeredDialog) {
    registeredDialog = true;
    registerDialog(element);
  }
  fireEvent(element, dialogShowEvent, systemLogDetailParams);
};
