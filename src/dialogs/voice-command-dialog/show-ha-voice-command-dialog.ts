import { fireEvent } from "../../common/dom/fire_event";
import { HomeAssistant } from "../../types";

const loadVoiceCommandDialog = () => import("./ha-voice-command-dialog");

export const showVoiceCommandDialog = (
  element: HTMLElement,
  hass: HomeAssistant
): void => {
  if (hass.auth.external?.config.hasAssist) {
    hass.auth.external!.fireMessage({
      type: "assist/show",
    });
    return;
  }
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-voice-command-dialog",
    dialogImport: loadVoiceCommandDialog,
    dialogParams: {},
  });
};
