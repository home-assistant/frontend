import { fireEvent } from "../../../../common/dom/fire_event";
import { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";

export interface DeleteBadgeDialogParams {
  deleteBadge: () => void;
  badgeConfig?: LovelaceBadgeConfig;
}

export const importDeleteBadgeDialog = () =>
  import("./hui-dialog-delete-badge");

export const showDeleteBadgeDialog = (
  element: HTMLElement,
  deleteBadgeDialogParams: DeleteBadgeDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-delete-badge",
    dialogImport: importDeleteBadgeDialog,
    dialogParams: deleteBadgeDialogParams,
  });
};
