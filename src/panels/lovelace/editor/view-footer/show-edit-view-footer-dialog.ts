import { fireEvent } from "../../../../common/dom/fire_event";
import type { LovelaceViewFooterConfig } from "../../../../data/lovelace/config/view";

export interface EditViewFooterDialogParams {
  saveConfig: (config: LovelaceViewFooterConfig) => void;
  config: LovelaceViewFooterConfig;
  maxColumns: number;
}

export const showEditViewFooterDialog = (
  element: HTMLElement,
  dialogParams: EditViewFooterDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-edit-view-footer",
    dialogImport: () => import("./hui-dialog-edit-view-footer"),
    dialogParams: dialogParams,
  });
};
