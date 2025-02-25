import { fireEvent } from "../../../../common/dom/fire_event";
import type { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";

export interface EditBadgeDialogParams {
  lovelaceConfig: LovelaceConfig;
  saveBadgeConfig: (badge: LovelaceBadgeConfig) => void;
  badgeConfig: LovelaceBadgeConfig;
  isNew?: boolean;
}

export const importEditBadgeDialog = () => import("./hui-dialog-edit-badge");

export const showEditBadgeDialog = (
  element: HTMLElement,
  editBadgeDialogParams: EditBadgeDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-edit-badge",
    dialogImport: importEditBadgeDialog,
    dialogParams: editBadgeDialogParams,
  });
};
