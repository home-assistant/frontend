import { fireEvent } from "../../../common/dom/fire_event";

export interface LogsDialogParams {
  provider: string;
  title: string;
  filter?: string;
}

export const showLogsDialog = (
  element: HTMLElement,
  dialogParams: LogsDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-logs",
    dialogImport: () => import("./dialog-logs"),
    dialogParams,
  });
};
