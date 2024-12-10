import { fireEvent } from "../../../../common/dom/fire_event";
import type { AutomationConfig } from "../../../../data/automation";
import type { ScriptConfig } from "../../../../data/script";

export const loadAutomationRenameDialog = () =>
  import("./dialog-automation-rename");

interface BaseRenameDialogParams {
  category?: string;
  labels?: string[];
  onClose: () => void;
}

export interface AutomationRenameDialogParams extends BaseRenameDialogParams {
  config: AutomationConfig;
  domain: "automation";
  updateConfig: (
    config: AutomationConfig,
    category?: string,
    labels?: string[]
  ) => void;
}

export interface ScriptRenameDialogParams extends BaseRenameDialogParams {
  config: ScriptConfig;
  domain: "script";
  updateConfig: (
    config: ScriptConfig,
    category?: string,
    labels?: string[]
  ) => void;
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
