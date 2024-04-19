import { fireEvent } from "../../../../../common/dom/fire_event";
import { LovelaceDashboardStrategyConfig } from "../../../../../data/lovelace/config/types";

export interface DashboardStrategyEditorDialogParams {
  config: LovelaceDashboardStrategyConfig;
  saveConfig: (config: LovelaceDashboardStrategyConfig) => void;
  takeControl: () => void;
  showRawConfigEditor: () => void;
}

export const loadDashboardStrategyEditorDialog = () =>
  import("./dialog-dashboard-strategy-editor");

export const showDashboardStrategyEditorDialog = (
  element: HTMLElement,
  params: DashboardStrategyEditorDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-dashboard-strategy-editor",
    dialogImport: loadDashboardStrategyEditorDialog,
    dialogParams: params,
  });
};
