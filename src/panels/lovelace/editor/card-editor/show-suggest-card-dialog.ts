import { fireEvent } from "../../../../common/dom/fire_event";
import { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import { LovelaceDashboardConfig } from "../../../../data/lovelace/config/dashboard";

export interface SuggestCardDialogParams {
  cardTitle?: string;
  lovelaceConfig?: LovelaceDashboardConfig;
  yaml?: boolean;
  saveConfig?: (config: LovelaceDashboardConfig) => void;
  path?: [number];
  entities: string[]; // We can pass entity id's that will be added to the config when a card is picked
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
