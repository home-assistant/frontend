import { fireEvent } from "../../../../common/dom/fire_event";
import type { AutomationConfig } from "../../../../data/automation";
import type { ScriptConfig } from "../../../../data/script";

export const loadAutomationModeDialog = () =>
  import("./dialog-automation-mode");

export interface AutomationModeDialog {
  config: AutomationConfig;
  updateConfig: (config: AutomationConfig) => void;
  onClose: () => void;
}

export interface ScriptModeDialog {
  config: ScriptConfig;
  updateConfig: (config: ScriptConfig) => void;
  onClose: () => void;
}

export const showAutomationModeDialog = (
  element: HTMLElement,
  dialogParams: AutomationModeDialog | ScriptModeDialog
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-automation-mode",
    dialogImport: loadAutomationModeDialog,
    dialogParams,
  });
};
