import { fireEvent } from "../../../../common/dom/fire_event";
import { Lovelace } from "../../types";

declare global {
  // for fire event
  interface HASSDomEvents {
    "show-move-card-view": MoveCardViewDialogParams;
  }
}

let registeredDialog = false;
const dialogShowEvent = "show-move-card-view";
const dialogTag = "hui-dialog-move-card-view";

export interface MoveCardViewDialogParams {
  path: [number, number];
  lovelace: Lovelace;
}

const registerEditCardDialog = (element: HTMLElement) =>
  fireEvent(element, "register-dialog", {
    dialogShowEvent,
    dialogTag,
    dialogImport: () => import("./hui-dialog-move-card-view"),
  });

export const showMoveCardViewDialog = (
  element: HTMLElement,
  moveCardViewDialogParams: MoveCardViewDialogParams
) => {
  if (!registeredDialog) {
    registeredDialog = true;
    registerEditCardDialog(element);
  }
  fireEvent(element, dialogShowEvent, moveCardViewDialogParams);
};
