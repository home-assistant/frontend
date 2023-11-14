import { fireEvent } from "../../../../common/dom/fire_event";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceDashboardConfig } from "../../../../data/lovelace/config/dashboard";

export interface EditCardDialogParams {
  lovelaceConfig: LovelaceDashboardConfig;
  saveConfig: (config: LovelaceDashboardConfig) => void;
  path: [number] | [number, number];
  cardConfig?: LovelaceCardConfig;
}

export const importEditCardDialog = () => import("./hui-dialog-edit-card");

export const showEditCardDialog = (
  element: HTMLElement,
  editCardDialogParams: EditCardDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-edit-card",
    dialogImport: importEditCardDialog,
    dialogParams: editCardDialogParams,
  });
};
