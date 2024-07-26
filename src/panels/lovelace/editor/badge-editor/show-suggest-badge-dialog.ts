import { fireEvent } from "../../../../common/dom/fire_event";
import { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";
import { LovelaceConfig } from "../../../../data/lovelace/config/types";
import { LovelaceContainerPath } from "../lovelace-path";

export interface SuggestBadgeDialogParams {
  lovelaceConfig?: LovelaceConfig;
  yaml?: boolean;
  saveConfig?: (config: LovelaceConfig) => void;
  path?: LovelaceContainerPath;
  entities?: string[]; // We pass this to create dialog when user chooses "Pick own"
  badgeConfig: LovelaceBadgeConfig[]; // We can pass a suggested config
}

const importSuggestBadgeDialog = () => import("./hui-dialog-suggest-badge");

export const showSuggestBadgeDialog = (
  element: HTMLElement,
  suggestBadgeDialogParams: SuggestBadgeDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-suggest-badge",
    dialogImport: importSuggestBadgeDialog,
    dialogParams: suggestBadgeDialogParams,
  });
};
