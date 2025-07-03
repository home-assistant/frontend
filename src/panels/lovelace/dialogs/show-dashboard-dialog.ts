import { fireEvent } from "../../../common/dom/fire_event";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";

export interface DashboardDialogParams {
  sections: LovelaceSectionConfig[];
  title: string;
  subtitle?: string;
}

export const showDashboardDialog = (
  element: HTMLElement,
  dialogParams: DashboardDialogParams
) => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-dashboard",
    dialogImport: () => import("./hui-dialog-dashboard"),
    dialogParams: dialogParams,
  });
};
