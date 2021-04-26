import { fireEvent, HASSDomEvent } from "../../../../common/dom/fire_event";
import { LovelaceViewConfig } from "../../../../data/lovelace";
import { Lovelace } from "../../types";

declare global {
  // for fire event
  interface HASSDomEvents {
    "reload-lovelace": undefined;
    "show-edit-view": EditViewDialogParams;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "reload-lovelace": HASSDomEvent<undefined>;
  }
}

let registeredDialog = false;
const dialogShowEvent = "show-edit-view";
const dialogTag = "hui-dialog-edit-view";

export interface EditViewDialogParams {
  lovelace: Lovelace;
  viewIndex?: number;
  saveCallback?: (viewIndex: number, viewConfig: LovelaceViewConfig) => void;
}

const registerEditViewDialog = (element: HTMLElement): Event =>
  fireEvent(element, "register-dialog", {
    dialogShowEvent,
    dialogTag,
    dialogImport: () => import("./hui-dialog-edit-view"),
  });

export const showEditViewDialog = (
  element: HTMLElement,
  editViewDialogParams: EditViewDialogParams
): void => {
  if (!registeredDialog) {
    registeredDialog = true;
    registerEditViewDialog(element);
  }
  fireEvent(element, dialogShowEvent, editViewDialogParams);
};
