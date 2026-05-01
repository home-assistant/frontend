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
  suggestions?: LovelaceDashboardSuggestions;
  /**
   * Create flow only; reserved url paths (dashboards, panels, and so on) so
   * auto-generated paths avoid collisions by appending -2, -3, and so on.
   */
  takenUrlPaths?: ReadonlySet<string>;
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
