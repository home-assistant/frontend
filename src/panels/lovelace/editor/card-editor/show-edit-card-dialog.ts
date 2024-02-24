import { fireEvent } from "../../../../common/dom/fire_event";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import { LovelaceContainerPath } from "../lovelace-path";

export type EditCardDialogParams = {
  lovelaceConfig: LovelaceConfig;
  saveConfig: (config: LovelaceConfig) => void;
  path: LovelaceContainerPath;
} & (
  | {
      cardIndex: number;
    }
  | {
      cardConfig: LovelaceCardConfig;
    }
);

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
