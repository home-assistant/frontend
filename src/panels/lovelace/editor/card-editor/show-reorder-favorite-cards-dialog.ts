import { fireEvent } from "../../../../common/dom/fire_event";

export interface FavoriteCardItem {
  key: string;
  name: string;
}

export interface ReorderFavoriteCardsDialogParams {
  favorites: FavoriteCardItem[];
  saveFavorites: (favorites: string[]) => void;
}

export const importReorderFavoriteCardsDialog = () =>
  import("./hui-dialog-reorder-favorite-cards");

export const showReorderFavoriteCardsDialog = (
  element: HTMLElement,
  reorderFavoriteCardsDialogParams: ReorderFavoriteCardsDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-reorder-favorite-cards",
    dialogImport: importReorderFavoriteCardsDialog,
    dialogParams: reorderFavoriteCardsDialogParams,
  });
};
