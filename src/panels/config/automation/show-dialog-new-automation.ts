import { fireEvent } from "../../../common/dom/fire_event";

export const loadNewAutomationDialog = () => import("./dialog-new-automation");

export const showNewAutomationDialog = (
  element: HTMLElement,
  script: boolean
): void => {
  const params = script ? { script: true } : {};
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-new-automation",
    dialogImport: loadNewAutomationDialog,
    dialogParams: params,
  });
};
