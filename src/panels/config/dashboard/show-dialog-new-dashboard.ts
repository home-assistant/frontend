import { fireEvent } from "../../../common/dom/fire_event";
import { LovelaceConfig } from "../../../data/lovelace/config/types";

export interface NewDashboardDialogParams {
  selectConfig: (config: LovelaceConfig | undefined) => any;
}

export const loadNewDashboardDialog = () => import("./dialog-new-dashboard");

export const showNewDashboardDialog = (
  element: HTMLElement,
  newDashboardDialogParams: NewDashboardDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-new-dashboard",
    dialogImport: loadNewDashboardDialog,
    dialogParams: newDashboardDialogParams,
  });
};
