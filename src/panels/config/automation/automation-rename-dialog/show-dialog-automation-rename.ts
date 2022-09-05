import { fireEvent } from "../../../../common/dom/fire_event";
import type { AutomationConfig } from "../../../../data/automation";

export const loadAutomationRenameDialog = () =>
  import("./dialog-automation-rename");

export interface AutomationRenameDialog {
  config: AutomationConfig;
  updateAutomation: (config: AutomationConfig) => void;
  onClose: () => void;
}

export const showAutomationRenameDialog = (
  element: HTMLElement,
  dialogParams: AutomationRenameDialog
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-automation-rename",
    dialogImport: loadAutomationRenameDialog,
    dialogParams,
  });
};
