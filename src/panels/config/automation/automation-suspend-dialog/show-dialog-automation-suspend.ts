import { fireEvent } from "../../../../common/dom/fire_event";

export interface AutomationSuspendDialogParams {
  entityId: string;
  name?: string;
  suspendedUntil?: string;
}

export const loadAutomationSuspendDialog = () =>
  import("./dialog-automation-suspend");

export const showAutomationSuspendDialog = (
  element: HTMLElement,
  dialogParams: AutomationSuspendDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-automation-suspend",
    dialogImport: loadAutomationSuspendDialog,
    dialogParams,
  });
};
