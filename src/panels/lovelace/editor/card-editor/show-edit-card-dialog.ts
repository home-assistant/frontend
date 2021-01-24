import { fireEvent } from "../../../../common/dom/fire_event";
import { LovelaceCardConfig, LovelaceConfig } from "../../../../data/lovelace";

export interface EditCardDialogParams {
  lovelaceConfig: LovelaceConfig;
  saveConfig: (config: LovelaceConfig) => void;
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
