import { fireEvent } from "../../../../common/dom/fire_event";
import { Lovelace } from "../../types";

declare global {
  // for fire event
  interface HASSDomEvents {
    "show-move-card-view": MoveCardViewDialogParams;
  }
}

let registeredDialog = false;

export interface MoveCardViewDialogParams {
  path: [number, number];
  lovelace: Lovelace;
}

const registerEditCardDialog = (element: HTMLElement): Event =>
  fireEvent(element, "register-dialog", {
    dialogShowEvent: "show-move-card-view",
    dialogTag: "hui-dialog-move-card-view",
    dialogImport: () =>
      import(
        /* webpackChunkName: "hui-dialog-move-card-view" */ "./hui-dialog-move-card-view"
      ),
  });

export const showMoveCardViewDialog = (
  element: HTMLElement,
  moveCardViewDialogParams: MoveCardViewDialogParams
): void => {
  if (!registeredDialog) {
    registeredDialog = true;
    registerEditCardDialog(element);
  }
  fireEvent(element, "show-move-card-view", moveCardViewDialogParams);
};
