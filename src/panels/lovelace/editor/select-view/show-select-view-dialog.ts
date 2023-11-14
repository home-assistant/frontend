import { fireEvent } from "../../../../common/dom/fire_event";
import { LovelaceDashboardConfig } from "../../../../data/lovelace/config/dashboard";
import { LovelaceDashboard } from "../../../../data/lovelace/dashboard";

export interface SelectViewDialogParams {
  lovelaceConfig: LovelaceDashboardConfig;
  allowDashboardChange: boolean;
  dashboards?: LovelaceDashboard[];
  urlPath?: string | null;
  header?: string;
  actionLabel?: string;
  viewSelectedCallback: (
    urlPath: string | null,
    config: LovelaceDashboardConfig,
    view: number
  ) => void;
}

export const showSelectViewDialog = (
  element: HTMLElement,
  selectViewDialogParams: SelectViewDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-select-view",
    dialogImport: () => import("./hui-dialog-select-view"),
    dialogParams: selectViewDialogParams,
  });
};
