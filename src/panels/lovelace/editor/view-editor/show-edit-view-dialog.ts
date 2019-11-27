import { HASSDomEvent, fireEvent } from "../../../../common/dom/fire_event";
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
}

const registerEditViewDialog = (element: HTMLElement): Event =>
  fireEvent(element, "register-dialog", {
    dialogShowEvent,
    dialogTag,
    dialogImport: () =>
      import(
        /* webpackChunkName: "hui-dialog-edit-view" */ "./hui-dialog-edit-view"
      ),
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
