import { fireEvent } from "../../../../common/dom/fire_event";
import { LovelaceDashboardStrategyConfig } from "../../../../data/lovelace/config/types";

export interface LovelaceDashboardConfigureStrategyDialogParams {
  config: LovelaceDashboardStrategyConfig;
  saveConfig: (values: LovelaceDashboardStrategyConfig) => Promise<unknown>;
}

export const loadDashboardConfigureStrategyDialog = () =>
  import("./dialog-lovelace-dashboard-configure-strategy");

export const showDashboardConfigureStrategyDialog = (
  element: HTMLElement,
  dialogParams: LovelaceDashboardConfigureStrategyDialogParams
) => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-lovelace-dashboard-configure-strategy",
    dialogImport: loadDashboardConfigureStrategyDialog,
    dialogParams,
  });
};
