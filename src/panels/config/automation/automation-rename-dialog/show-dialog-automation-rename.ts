import { fireEvent } from "../../../../common/dom/fire_event";
import type { AutomationConfig } from "../../../../data/automation";
import type { ScriptConfig } from "../../../../data/script";

export const loadAutomationRenameDialog = () =>
  import("./dialog-automation-rename");

export interface AutomationRenameDialogParams {
  config: AutomationConfig;
  domain: "automation";
  updateConfig: (config: AutomationConfig) => void;
  onClose: () => void;
}

export interface ScriptRenameDialogParams {
  config: ScriptConfig;
  domain: "script";
  updateConfig: (config: ScriptConfig) => void;
  onClose: () => void;
}

export const showAutomationRenameDialog = (
  element: HTMLElement,
  dialogParams: AutomationRenameDialogParams | ScriptRenameDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-automation-rename",
    dialogImport: loadAutomationRenameDialog,
    dialogParams,
  });
};
