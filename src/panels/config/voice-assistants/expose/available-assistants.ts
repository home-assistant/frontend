import memoizeOne from "memoize-one";
import type { CloudStatus } from "../../../../data/cloud";
import { voiceAssistants } from "../../../../data/expose";

export const getAvailableAssistants = memoizeOne(
  (cloudStatus: CloudStatus | undefined) => {
    const googleEnabled =
      cloudStatus?.logged_in === true &&
      cloudStatus.prefs.google_enabled === true;
    const alexaEnabled =
      cloudStatus?.logged_in === true &&
      cloudStatus.prefs.alexa_enabled === true;

    const showAssistants = [...Object.keys(voiceAssistants)];

    if (!googleEnabled) {
      showAssistants.splice(
        showAssistants.indexOf("cloud.google_assistant"),
        1
      );
    }

    if (!alexaEnabled) {
      showAssistants.splice(showAssistants.indexOf("cloud.alexa"), 1);
    }

    return showAssistants;
  }
);
