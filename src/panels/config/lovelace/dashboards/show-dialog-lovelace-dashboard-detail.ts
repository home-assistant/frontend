import { fireEvent } from "../../../../common/dom/fire_event";
import {
  LovelaceDashboard,
  LovelaceDashboardMutableParams,
  LovelaceDashboardCreateParams,
} from "../../../../data/lovelace";

export interface LovelaceDashboardDetailsDialogParams {
  dashboard?: LovelaceDashboard;
  createDashboard: (values: LovelaceDashboardCreateParams) => Promise<unknown>;
  updateDashboard: (
    updates: Partial<LovelaceDashboardMutableParams>
  ) => Promise<unknown>;
  removeDashboard: () => Promise<boolean>;
}

export const loadDashboardDetailDialog = () =>
  import(
    /* webpackChunkName: "lovelace-dashboard-detail-dialog" */ "./dialog-lovelace-dashboard-detail"
  );

export const showDashboardDetailDialog = (
  element: HTMLElement,
  dialogParams: LovelaceDashboardDetailsDialogParams
) => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-lovelace-dashboard-detail",
    dialogImport: loadDashboardDetailDialog,
    dialogParams,
  });
};
