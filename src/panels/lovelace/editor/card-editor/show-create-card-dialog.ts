import { fireEvent } from "../../../../common/dom/fire_event";
import { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";

export interface CreateCardDialogParams {
  lovelaceConfig: LovelaceConfig;
  preSaveConfig?: (
    config: LovelaceCardConfig
  ) => LovelaceCardConfig | Promise<LovelaceCardConfig>;
  saveConfig: (config: LovelaceConfig) => void;
  path: [number] | [number, number];
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
