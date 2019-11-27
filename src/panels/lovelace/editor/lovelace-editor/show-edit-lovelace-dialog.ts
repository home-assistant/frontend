import { fireEvent } from "../../../../common/dom/fire_event";
import { Lovelace } from "../../types";

declare global {
  // for fire event
  interface HASSDomEvents {
    "show-edit-lovelace": Lovelace;
  }
}

let registeredDialog = false;
const dialogShowEvent = "show-edit-lovelace";
const dialogTag = "hui-dialog-edit-lovelace";

const registerEditLovelaceDialog = (element: HTMLElement): Event =>
  fireEvent(element, "register-dialog", {
    dialogShowEvent,
    dialogTag,
    dialogImport: () =>
      import(
        /* webpackChunkName: "hui-dialog-edit-lovelace" */ "./hui-dialog-edit-lovelace"
      ),
  });

export const showEditLovelaceDialog = (
  element: HTMLElement,
  lovelace: Lovelace
): void => {
  if (!registeredDialog) {
    registeredDialog = true;
    registerEditLovelaceDialog(element);
  }
  fireEvent(element, dialogShowEvent, lovelace);
};
