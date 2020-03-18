import { fireEvent } from "../../../../common/dom/fire_event";
import { LovelaceConfig, LovelaceCardConfig } from "../../../../data/lovelace";

export interface EditCardDialogParams {
  lovelaceConfig: LovelaceConfig;
  saveConfig: (config: LovelaceConfig) => void;
  path: [number] | [number, number];
  entities?: string[]; // We can pass entity id's that will be added to the config when a card is picked
  cardConfig?: LovelaceCardConfig;
}

const importEditCardDialog = () =>
  import(
    /* webpackChunkName: "hui-dialog-edit-card" */ "./hui-dialog-edit-card"
  );

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
