import { fireEvent } from "../../common/dom/fire_event";

export interface TTSTryDialogParams {
  engine: string;
  language?: string;
  voice?: string;
}

export const loadTTSTryDialog = () => import("./dialog-tts-try");

export const showTTSTryDialog = (
  element: HTMLElement,
  dialogParams: TTSTryDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    addHistory: false,
    dialogTag: "dialog-tts-try",
    dialogImport: loadTTSTryDialog,
    dialogParams,
  });
};
