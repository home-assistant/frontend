import { fireEvent } from "../../../../common/dom/fire_event";

export const loadVoiceAssistantsView = () =>
  import("./ha-more-info-view-voice-assistants");

export const showVoiceAssistantsView = (
  element: HTMLElement,
  title: string
): void => {
  fireEvent(element, "show-child-view", {
    tag: "ha-more-info-view-voice-assistants",
    import: loadVoiceAssistantsView,
    title: title,
    params: {},
  });
};
