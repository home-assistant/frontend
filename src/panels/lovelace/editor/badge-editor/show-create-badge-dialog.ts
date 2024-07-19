import { fireEvent } from "../../../../common/dom/fire_event";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import { LovelaceContainerPath } from "../lovelace-path";

export interface CreateBadgeDialogParams {
  lovelaceConfig: LovelaceConfig;
  saveConfig: (config: LovelaceConfig) => void;
  path: LovelaceContainerPath;
  suggestedBadges?: string[];
  entities?: string[]; // We can pass entity id's that will be added to the config when a badge is picked
}

export const importCreateBadgeDialog = () =>
  import("./hui-dialog-create-badge");

export const showCreateBadgeDialog = (
  element: HTMLElement,
  createBadgeDialogParams: CreateBadgeDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-create-badge",
    dialogImport: importCreateBadgeDialog,
    dialogParams: createBadgeDialogParams,
  });
};
