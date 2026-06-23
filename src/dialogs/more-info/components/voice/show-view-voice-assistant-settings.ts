import { fireEvent } from "../../../../common/dom/fire_event";

export const loadVoiceAssistantSettingsView = () =>
  import("./ha-more-info-view-voice-assistant-settings");

export const showVoiceAssistantSettingsView = (
  element: HTMLElement,
  title: string,
  assistant: string
): void => {
  fireEvent(element, "show-child-view", {
    viewTag: "ha-more-info-view-voice-assistant-settings",
    viewImport: loadVoiceAssistantSettingsView,
    viewTitle: title,
    viewParams: { assistant },
  });
};
