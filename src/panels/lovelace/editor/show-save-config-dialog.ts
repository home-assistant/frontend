import { fireEvent } from "../../../common/dom/fire_event";
import { Lovelace } from "../types";

declare global {
  // for fire event
  interface HASSDomEvents {
    "show-save-config": SaveDialogParams;
  }
}

const dialogShowEvent = "show-save-config";
const dialogTag = "hui-dialog-save-config";

export interface SaveDialogParams {
  lovelace: Lovelace;
  mode: "yaml" | "storage";
  narrow: boolean;
}

let registeredDialog = false;

export const showSaveDialog = (
  element: HTMLElement,
  saveDialogParams: SaveDialogParams
) => {
  if (!registeredDialog) {
    registeredDialog = true;
    fireEvent(element, "register-dialog", {
      dialogShowEvent,
      dialogTag,
      dialogImport: () => import("./hui-dialog-save-config"),
    });
  }
  fireEvent(element, dialogShowEvent, saveDialogParams);
};
