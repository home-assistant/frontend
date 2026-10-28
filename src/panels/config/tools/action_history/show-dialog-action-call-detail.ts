import { fireEvent } from "../../../../common/dom/fire_event";
import type { LogbookActionCall } from "../../../../data/logbook";
import type { LogbookCause } from "../../../logbook/logbook-entry-model";

export interface ActionCallDetailDialogParams {
  call: LogbookActionCall;
  /** The translated name of the action. */
  name: string;
  /** What made the call, like an automation, a script, or a user. */
  cause?: LogbookCause;
  /** The user the call was made for, if that is not already the cause. */
  user?: LogbookCause;
  traceUrl?: string;
}

export const showActionCallDetailDialog = (
  element: HTMLElement,
  dialogParams: ActionCallDetailDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-action-call-detail",
    dialogImport: () => import("./dialog-action-call-detail"),
    dialogParams,
  });
};
