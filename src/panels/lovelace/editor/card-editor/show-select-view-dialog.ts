import { fireEvent } from "../../../../common/dom/fire_event";
import { Lovelace } from "../../types";

declare global {
  // for fire event
  interface HASSDomEvents {
    "show-select-view": SelectViewDialogParams;
  }
}

let registeredDialog = false;

export interface SelectViewDialogParams {
  lovelace: Lovelace;
}

const registerSelectViewDialog = (element: HTMLElement): Event =>
  fireEvent(element, "register-dialog", {
    dialogShowEvent: "show-select-view",
    dialogTag: "hui-dialog-select-view",
    dialogImport: () =>
      import(/* webpackChunkName: "hui-dialog-select-view" */ "./hui-dialog-select-view"),
  });

export const showSelectViewDialog = (
  element: HTMLElement,
  selectViewDialogParams: SelectViewDialogParams
): void => {
  if (!registeredDialog) {
    registeredDialog = true;
    registerSelectViewDialog(element);
  }
  fireEvent(element, "show-select-view", selectViewDialogParams);
};
