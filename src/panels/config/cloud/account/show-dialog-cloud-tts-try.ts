import { fireEvent } from "../../../../common/dom/fire_event";

export interface TryTtsDialogParams {
  defaultVoice: [string, string];
}

export const loadTryTtsDialog = () => import("./dialog-cloud-tts-try");

export const showTryTtsDialog = (
  element: HTMLElement,
  dialogParams: TryTtsDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-cloud-try-tts",
    dialogImport: loadTryTtsDialog,
    dialogParams,
  });
};
