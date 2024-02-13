import { fireEvent } from "../../../../common/dom/fire_event";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import { LovelaceCardPath } from "../config-util";

type PartialLovelaceCardPath = [number, null] | [number, number, null];

export interface EditCardDialogParams {
  lovelaceConfig: LovelaceConfig;
  saveConfig: (config: LovelaceConfig) => void;
  path: LovelaceCardPath | PartialLovelaceCardPath;
  // If specified, the card will be replaced with the new card.
  newCardConfig?: LovelaceCardConfig;
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
