import { fireEvent } from "../../../common/dom/fire_event";

export interface NewAutomationDialogParams {
  mode: "script" | "automation";
}

export const loadNewAutomationDialog = () => import("./dialog-new-automation");

export const showNewAutomationDialog = (
  element: HTMLElement,
  newAutomationDialogParams: NewAutomationDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-new-automation",
    dialogImport: loadNewAutomationDialog,
    dialogParams: newAutomationDialogParams,
  });
};
