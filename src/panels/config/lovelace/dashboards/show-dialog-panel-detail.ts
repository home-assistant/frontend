import { fireEvent } from "../../../../common/dom/fire_event";
import type { PanelMutableParams } from "../../../../data/panel";

export interface PanelDetailDialogParams {
  urlPath: string;
  title: string;
  icon?: string;
  requireAdmin: boolean;
  showInSidebar: boolean;
  isDefault: boolean;
  updatePanel: (updates: PanelMutableParams) => Promise<unknown>;
}

export const loadPanelDetailDialog = () => import("./dialog-panel-detail");

export const showPanelDetailDialog = (
  element: HTMLElement,
  dialogParams: PanelDetailDialogParams
) => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-panel-detail",
    dialogImport: loadPanelDetailDialog,
    dialogParams,
  });
};
