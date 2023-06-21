import { fireEvent } from "../../common/dom/fire_event";
import { HomeAssistant } from "../../types";

const loadVoiceCommandDialog = () => import("./ha-voice-command-dialog");

export interface VoiceCommandDialogParams {
  pipeline_id?: string;
  start_listening?: boolean;
}

export const showVoiceCommandDialog = (
  element: HTMLElement,
  hass: HomeAssistant,
  dialogParams?: VoiceCommandDialogParams
): void => {
  if (hass.auth.external?.config.hasAssist) {
    hass.auth.external!.fireMessage({
      type: "assist/show",
      payload: {
        pipeline_id: dialogParams?.pipeline_id,
        start_listening: dialogParams?.start_listening,
      },
    });
    return;
  }
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-voice-command-dialog",
    dialogImport: loadVoiceCommandDialog,
    dialogParams,
  });
};
