import { fireEvent } from "../../../../common/dom/fire_event";
import { LovelaceConfig } from "../../../../data/lovelace";

export interface ShowCardDialogParams {
  lovelaceConfig: LovelaceConfig;
  saveConfig: (config: LovelaceConfig) => void;
  path: [number] | [number, number];
  entities?: string[]; // We can pass entity id's that will be added to the config when a card is picked
}

const importCreateCardDialog = () =>
  import(
    /* webpackChunkName: "hui-dialog-edit-card" */ "./hui-dialog-create-card"
  );

export const showCreateCardDialog = (
  element: HTMLElement,
  createCardDialogParams: ShowCardDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-create-card",
    dialogImport: importCreateCardDialog,
    dialogParams: createCardDialogParams,
  });
};
