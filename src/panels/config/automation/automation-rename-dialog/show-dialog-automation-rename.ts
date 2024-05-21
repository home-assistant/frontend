import { fireEvent } from "../../../../common/dom/fire_event";
import type { AutomationConfig } from "../../../../data/automation";
import type { ScriptConfig } from "../../../../data/script";

export const loadAutomationRenameDialog = () =>
  import("./dialog-automation-rename");

export interface AutomationRenameDialog {
  config: AutomationConfig;
  updateConfig: (config: AutomationConfig, icon: string | undefined) => void;
  onClose: () => void;
}

export interface ScriptRenameDialog {
  config: ScriptConfig;
  updateConfig: (config: ScriptConfig) => void;
  icon: string | undefined;
  onClose: () => void;
}

export const showAutomationRenameDialog = (
  element: HTMLElement,
  dialogParams: AutomationRenameDialog | ScriptRenameDialog
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-automation-rename",
    dialogImport: loadAutomationRenameDialog,
    dialogParams,
  });
};
