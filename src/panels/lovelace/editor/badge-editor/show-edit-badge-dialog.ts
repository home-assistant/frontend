import { fireEvent } from "../../../../common/dom/fire_event";
import type { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import { LovelaceContainerPath } from "../lovelace-path";

export type EditBadgeDialogParams = {
  lovelaceConfig: LovelaceConfig;
  saveConfig: (config: LovelaceConfig) => void;
  path: LovelaceContainerPath;
} & (
  | {
      badgeIndex: number;
    }
  | {
      badgeConfig: LovelaceBadgeConfig;
    }
);

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
