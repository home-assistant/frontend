import { fireEvent } from "../../../../common/dom/fire_event";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { LovelaceDashboard } from "../../../../data/lovelace/dashboard";

export interface SelectDashboardDialogParams {
  lovelaceConfig: LovelaceConfig;
  dashboards?: LovelaceDashboard[];
  urlPath?: string | null;
  header?: string;
  actionLabel?: string;
  dashboardSelectedCallback: (urlPath: string | null) => any;
}

export const showSelectDashboardDialog = (
  element: HTMLElement,
  selectViewDialogParams: SelectDashboardDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-select-dashboard",
    dialogImport: () => import("./hui-dialog-select-dashboard"),
    dialogParams: selectViewDialogParams,
  });
};
