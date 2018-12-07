import { HASSDomEvent, fireEvent } from "../../../common/dom/fire_event";
import { LovelaceViewConfig } from "../../../data/lovelace";

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
  viewConfig?: LovelaceViewConfig;
  add?: boolean;
  reloadLovelace: () => void;
}

const registerEditViewDialog = (element: HTMLElement) =>
  fireEvent(element, "register-dialog", {
    dialogShowEvent,
    dialogTag,
    dialogImport: () => import("./hui-dialog-edit-view"),
  });

export const showEditViewDialog = (
  element: HTMLElement,
  editViewDialogParams: EditViewDialogParams
) => {
  if (!registeredDialog) {
    registeredDialog = true;
    registerEditViewDialog(element);
  }
  fireEvent(element, dialogShowEvent, editViewDialogParams);
};
