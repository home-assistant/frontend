import { fireEvent } from "../../../common/dom/fire_event";

export const loadNewAutomationDialog = () => import("./dialog-new-automation");

export const showNewAutomationDialog = (
  element: HTMLElement,
  mode: "script" | "automation"
): void => {
  const params = mode === "script" ? { script: true } : {};
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-new-automation",
    dialogImport: loadNewAutomationDialog,
    dialogParams: params,
  });
};
