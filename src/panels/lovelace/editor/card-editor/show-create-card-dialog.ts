import { fireEvent } from "../../../../common/dom/fire_event";
import type { LovelaceDashboardConfig } from "../../../../data/lovelace/config/dashboard";

export interface CreateCardDialogParams {
  lovelaceConfig: LovelaceDashboardConfig;
  saveConfig: (config: LovelaceDashboardConfig) => void;
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
