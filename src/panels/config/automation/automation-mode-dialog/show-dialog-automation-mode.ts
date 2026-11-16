import { fireEvent } from "../../../../common/dom/fire_event";
import type { AutomationConfig } from "../../../../data/automation";
import type { ScriptConfig } from "../../../../data/script";

export const loadAutomationModeDialog = () =>
  import("./dialog-automation-mode");

export interface AutomationModeDialog {
  config: AutomationConfig;
  updateConfig: (config: AutomationConfig) => void;
  onClose: () => void;
  /**
   * The config before changes the user reviews. The dialog then only shows
   * the mode and how it changed.
   */
  previousConfig?: Pick<AutomationConfig, "mode" | "max">;
}

export interface ScriptModeDialog {
  config: ScriptConfig;
  updateConfig: (config: ScriptConfig) => void;
  onClose: () => void;
  previousConfig?: Pick<ScriptConfig, "mode" | "max">;
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
