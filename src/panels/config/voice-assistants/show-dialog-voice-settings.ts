import { fireEvent } from "../../../common/dom/fire_event";

export interface VoiceSettingsDialogParams {
  entityId: string;
}

export const loadVoiceSettingsDialog = () => import("./dialog-voice-settings");

export const showVoiceSettingsDialog = (
  element: HTMLElement,
  aliasesParams: VoiceSettingsDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-voice-settings",
    dialogImport: loadVoiceSettingsDialog,
    dialogParams: aliasesParams,
  });
};
