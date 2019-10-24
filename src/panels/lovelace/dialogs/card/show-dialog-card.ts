import { LovelaceCardConfig } from "../../../../data/lovelace";
import { fireEvent } from "../../../../common/dom/fire_event";

export interface CardDialogParams {
  card: LovelaceCardConfig;
}

export const loadCardDialog = () =>
  import(/* webpackChunkName: "confirmation" */ "./dialog-card");

export const showCardDialog = (
  element: HTMLElement,
  dialogParams: CardDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-card",
    dialogImport: loadCardDialog,
    dialogParams,
  });
};
