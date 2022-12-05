import { fireEvent } from "../../../../common/dom/fire_event";
import type { AutomationConfig } from "../../../../data/automation";

export const loadAutomationModeDialog = () =>
  import("./dialog-automation-mode");

export interface AutomationModeDialog {
  config: AutomationConfig;
  updateAutomation: (config: AutomationConfig) => void;
  onClose: () => void;
}

export const showAutomationModeDialog = (
  element: HTMLElement,
  dialogParams: AutomationModeDialog
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-automation-mode",
    dialogImport: loadAutomationModeDialog,
    dialogParams,
  });
};
