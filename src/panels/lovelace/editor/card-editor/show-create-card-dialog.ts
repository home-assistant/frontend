import { fireEvent } from "../../../../common/dom/fire_event";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";

export interface CreateCardDialogParams {
  lovelaceConfig: LovelaceConfig;
  saveConfig: (config: LovelaceConfig) => void;
  path: [number];
  entities?: string[]; // We can pass entity id's that will be added to the config when a card is picked
}

export const importCreateCardDialog = () => import("./hui-dialog-create-card");

export const showCreateCardDialog = (
  element: HTMLElement,
  createCardDialogParams: CreateCardDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-create-card",
    dialogImport: importCreateCardDialog,
    dialogParams: createCardDialogParams,
  });
};
