import { TemplateResult } from "lit";
import { fireEvent } from "../../common/dom/fire_event";
import { RecurrenceRange } from "../../data/calendar";

export interface ConfirmEventDialogBoxParams {
  confirmText?: string;
  confirmFutureText?: string; // Prompt for future recurring events
  confirm?: (recurrenceRange: RecurrenceRange) => void;
  cancel?: () => void;
  text?: string | TemplateResult;
  title: string;
}

export const loadGenericDialog = () => import("./confirm-event-dialog-box");

export const showConfirmEventDialog = (
  element: HTMLElement,
  dialogParams: ConfirmEventDialogBoxParams
) =>
  new Promise<RecurrenceRange | undefined>((resolve) => {
    fireEvent(element, "show-dialog", {
      dialogTag: "confirm-event-dialog-box",
      dialogImport: loadGenericDialog,
      dialogParams: {
        ...dialogParams,
        confirm: (thisAndFuture: RecurrenceRange) => {
          resolve(thisAndFuture);
        },
        cancel: () => {
          resolve(undefined);
        },
      },
      addHistory: false,
    });
  });
