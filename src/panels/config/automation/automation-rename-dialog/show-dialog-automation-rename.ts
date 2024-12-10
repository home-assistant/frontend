import { fireEvent } from "../../../../common/dom/fire_event";
import type { AutomationConfig } from "../../../../data/automation";
import type { ScriptConfig } from "../../../../data/script";

export const loadAutomationRenameDialog = () =>
  import("./dialog-automation-rename");

interface BaseRenameDialogParams {
  entityRegistryUpdate: EntityRegistryUpdate;
  onClose: () => void;
}

export interface EntityRegistryUpdate {
  labels: string[];
  category: string;
}

export interface AutomationRenameDialogParams extends BaseRenameDialogParams {
  config: AutomationConfig;
  domain: "automation";
  updateConfig: (
    config: AutomationConfig,
    entityRegistryUpdate: EntityRegistryUpdate
  ) => void;
}

export interface ScriptRenameDialogParams extends BaseRenameDialogParams {
  config: ScriptConfig;
  domain: "script";
  updateConfig: (
    config: ScriptConfig,
    entityRegistryUpdate: EntityRegistryUpdate
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
