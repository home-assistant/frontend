import { fireEvent } from "../../../../common/dom/fire_event";

export const loadAutomationSaveTimeoutDialog = () =>
  import("./dialog-automation-save-timeout");

export interface AutomationSaveTimeoutDialogParams {
  onClose?: () => void;
  savedPromise: Promise<any>;
  type: "automation" | "script" | "scene";
}

export const showAutomationSaveTimeoutDialog = (
  element: HTMLElement,
  dialogParams: AutomationSaveTimeoutDialogParams
) =>
  new Promise<void>((resolve) => {
    const origClose = dialogParams.onClose;
    fireEvent(element, "show-dialog", {
      dialogTag: "ha-dialog-automation-save-timeout",
      dialogImport: loadAutomationSaveTimeoutDialog,
      dialogParams: {
        ...dialogParams,
        onClose: () => {
          resolve();
          if (origClose) {
            origClose();
          }
        },
      },
    });
  });
