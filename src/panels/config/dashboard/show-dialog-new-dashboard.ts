import { fireEvent } from "../../../common/dom/fire_event";
import type { LovelaceRawConfig } from "../../../data/lovelace/config/types";

export interface NewDashboardDialogParams {
  selectConfig: (config: LovelaceRawConfig | undefined) => void | Promise<void>;
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
