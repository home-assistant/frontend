import { fireEvent } from "../../common/dom/fire_event";

const loadVoiceAssistantSetupDialog = () =>
  import("./voice-assistant-setup-dialog");

export interface VoiceAssistantSetupDialogParams {
  deviceId: string;
}

export const showVoiceAssistantSetupDialog = (
  element: HTMLElement,
  dialogParams: VoiceAssistantSetupDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-voice-assistant-setup-dialog",
    dialogImport: loadVoiceAssistantSetupDialog,
    dialogParams: dialogParams,
  });
};
