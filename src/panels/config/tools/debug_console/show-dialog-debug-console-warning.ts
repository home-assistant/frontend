import { fireEvent } from "../../../../common/dom/fire_event";

export interface DebugConsoleWarningDialogParams {
  /** Called once the dialog is gone, with whether the user accepted it. */
  closedCallback: (accepted: boolean) => void;
}

export const showDebugConsoleWarningDialog = (
  element: HTMLElement,
  dialogParams: DebugConsoleWarningDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-debug-console-warning",
    dialogImport: () => import("./dialog-debug-console-warning"),
    dialogParams,
  });
};
