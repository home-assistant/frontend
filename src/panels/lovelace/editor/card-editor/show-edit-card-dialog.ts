import { fireEvent } from "../../../../common/dom/fire_event";
import { LovelaceConfig } from "../../../../data/lovelace";

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
  lovelaceConfig: LovelaceConfig;
  saveConfig: (config: LovelaceConfig) => void;
  path: [number] | [number, number];
  entities?: string[]; // We can pass entity id's that will be added to the config when a card is picked
}

const registerEditCardDialog = (element: HTMLElement): Event =>
  fireEvent(element, "register-dialog", {
    dialogShowEvent,
    dialogTag,
    dialogImport: () =>
      import(
        /* webpackChunkName: "hui-dialog-edit-card" */ "./hui-dialog-edit-card"
      ),
  });

export const showEditCardDialog = (
  element: HTMLElement,
  editCardDialogParams: EditCardDialogParams
): void => {
  if (!registeredDialog) {
    registeredDialog = true;
    registerEditCardDialog(element);
  }
  fireEvent(element, dialogShowEvent, editCardDialogParams);
};
