import { fireEvent } from "../../../../common/dom/fire_event";
import type {
  LovelaceDashboard,
  LovelaceDashboardCreateParams,
  LovelaceDashboardSuggestions,
  LovelaceDashboardMutableParams,
} from "../../../../data/lovelace/dashboard";

export interface LovelaceDashboardDetailsDialogParams {
  dashboard?: LovelaceDashboard;
  urlPath?: string;
  isDefault?: boolean;
  /** Create flow only; optional suggested values for the form. */
  fieldSuggestions?: LovelaceDashboardSuggestions;
  createDashboard?: (values: LovelaceDashboardCreateParams) => Promise<unknown>;
  updateDashboard: (
    updates: Partial<LovelaceDashboardMutableParams>
  ) => Promise<unknown>;
  removeDashboard: () => Promise<boolean>;
}

export const loadDashboardDetailDialog = () =>
  import("./dialog-lovelace-dashboard-detail");

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
