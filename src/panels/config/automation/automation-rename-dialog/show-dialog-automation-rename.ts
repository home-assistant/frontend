import { fireEvent } from "../../../../common/dom/fire_event";
import type { AutomationConfig } from "../../../../data/automation";
import type { ScriptConfig } from "../../../../data/script";

export const loadAutomationRenameDialog = () =>
  import("./dialog-automation-rename");

export interface AutomationRenameDialogParams {
  config: AutomationConfig;
  supportsIcon: boolean;
  updateConfig: (config: AutomationConfig, icon: string | undefined) => void;
  icon: string | undefined;
  onClose: () => void;
}

export interface ScriptnRenameDialogParams {
  config: ScriptConfig;
  supportsIcon: boolean;
  updateConfig: (config: ScriptConfig) => void;
  icon: string | undefined;
  onClose: () => void;
}

export const showAutomationRenameDialog = (
  element: HTMLElement,
  dialogParams: AutomationRenameDialogParams | ScriptnRenameDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-automation-rename",
    dialogImport: loadAutomationRenameDialog,
    dialogParams,
  });
};
