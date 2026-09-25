import { fireEvent } from "../../common/dom/fire_event";
import type { RecurrenceRange } from "../../data/calendar";

export interface ConfirmEventDialogBoxParams {
  title: string;
  // Labels the recurrence range options when `recurring` is set
  text?: string;
  confirmText?: string;
  // Let the user pick which occurrences of a recurring event are affected
  recurring?: boolean;
  destructive?: boolean;
  confirm?: (recurrenceRange: RecurrenceRange) => void;
  cancel?: () => void;
}

export const loadGenericDialog = () => import("./confirm-event-dialog-box");

export const showConfirmEventDialog = (
  element: HTMLElement,
  dialogParams: ConfirmEventDialogBoxParams
) =>
  new Promise<RecurrenceRange | undefined>((resolve) => {
    const origConfirm = dialogParams.confirm;
    const origCancel = dialogParams.cancel;

    fireEvent(element, "show-dialog", {
      dialogTag: "confirm-event-dialog-box",
      dialogImport: loadGenericDialog,
      dialogParams: {
        ...dialogParams,
        confirm: (thisAndFuture: RecurrenceRange) => {
          resolve(thisAndFuture);
          if (origConfirm) {
            origConfirm(thisAndFuture);
          }
        },
        cancel: () => {
          resolve(undefined);
          if (origCancel) {
            origCancel();
          }
        },
      },
      addHistory: false,
    });
  });
