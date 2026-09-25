import { fireEvent } from "../../../../common/dom/fire_event";
import type { LovelaceViewHeaderConfig } from "../../../../data/lovelace/config/view";

export interface EditViewHeaderDialogParams {
  saveConfig: (config: LovelaceViewHeaderConfig) => void;
  config: LovelaceViewHeaderConfig;
}

export const showEditViewHeaderDialog = (
  element: HTMLElement,
  dialogParams: EditViewHeaderDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-edit-view-header",
    dialogImport: () => import("./hui-dialog-edit-view-header"),
    dialogParams: dialogParams,
  });
};
