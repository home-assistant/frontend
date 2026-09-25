import { fireEvent } from "../../../../common/dom/fire_event";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { LovelaceContainerPath } from "../lovelace-path";

export interface CreateCardDialogParams {
  lovelaceConfig: LovelaceConfig;
  saveConfig: (config: LovelaceConfig) => void;
  path: LovelaceContainerPath;
  suggestedCards?: string[];
  entities?: string[]; // We can pass entity id's that will be added to the config when a card is picked
  saveCard?: (cardConfig: LovelaceCardConfig) => void; // Optional: pick a single card and return it via callback, hides entity tab
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
