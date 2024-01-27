import { fireEvent } from "../../../../common/dom/fire_event";
import { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import { LovelaceConfig } from "../../../../data/lovelace/config/types";

export interface SuggestCardDialogParams {
  lovelaceConfig?: LovelaceConfig;
  yaml?: boolean;
  saveConfig?: (config: LovelaceConfig) => void;
  path?: [number];
  entities?: string[]; // Entities used to generate the card config. We pass this to create dialog when user chooses "Pick own"
  cardConfig?: LovelaceCardConfig[]; // We can pass a suggested config
}

const importsuggestCardDialog = () => import("./hui-dialog-suggest-card");

export const showSuggestCardDialog = (
  element: HTMLElement,
  suggestCardDialogParams: SuggestCardDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-suggest-card",
    dialogImport: importsuggestCardDialog,
    dialogParams: suggestCardDialogParams,
  });
};
