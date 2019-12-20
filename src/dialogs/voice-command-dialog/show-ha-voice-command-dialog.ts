import { fireEvent } from "../../common/dom/fire_event";

const loadVoiceCommandDialog = () =>
  import(
    /* webpackChunkName: "ha-voice-command-dialog" */ "./ha-voice-command-dialog"
  );

export const showVoiceCommandDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-voice-command-dialog",
    dialogImport: loadVoiceCommandDialog,
    dialogParams: {},
  });
};
