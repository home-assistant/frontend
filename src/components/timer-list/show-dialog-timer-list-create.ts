import { fireEvent } from "../../common/dom/fire_event";

export interface TimerListCreateDialogParams {
  entityId: string;
}

export const showTimerListCreateDialog = (
  element: HTMLElement,
  dialogParams: TimerListCreateDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-timer-list-create",
    dialogImport: () => import("./dialog-timer-list-create"),
    dialogParams,
  });
};
