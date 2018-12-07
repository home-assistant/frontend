import { LovelaceCardConfig } from "../../../data/lovelace";
import { fireEvent } from "../../../common/dom/fire_event";

declare global {
  // for fire event
  interface HASSDomEvents {
    "show-edit-card": EditCardDialogParams;
  }
}

let registeredDialog = false;
const dialogShowEvent = "show-edit-card";
const dialogTag = "hui-dialog-edit-card";

export interface EditCardDialogParams {
  cardConfig?: LovelaceCardConfig;
  viewId?: string | number;
  add: boolean;
  reloadLovelace: () => void;
}

const registerEditCardDialog = (element: HTMLElement) =>
  fireEvent(element, "register-dialog", {
    dialogShowEvent,
    dialogTag,
    dialogImport: () => import("./hui-dialog-edit-card"),
  });

export const showEditCardDialog = (
  element: HTMLElement,
  editCardDialogParams: EditCardDialogParams
) => {
  if (!registeredDialog) {
    registeredDialog = true;
    registerEditCardDialog(element);
  }
  fireEvent(element, dialogShowEvent, editCardDialogParams);
};
