import { fireEvent } from "../../../../common/dom/fire_event";
import { LovelaceConfig, LovelaceDashboard } from "../../../../data/lovelace";

export interface SelectViewDialogParams {
  lovelaceConfig: LovelaceConfig;
  allowDashboardChange: boolean;
  dashboards?: LovelaceDashboard[];
  urlPath?: string | null;
  header?: string;
  actionLabel?: string;
  viewSelectedCallback: (
    urlPath: string | null,
    config: LovelaceConfig,
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
