import memoizeOne from "memoize-one";
import type { CloudStatus } from "../../../../data/cloud";

export const getAvailableAssistants = memoizeOne(
  (cloudStatus: CloudStatus | undefined) => {
    const conversationEnabled = true; // until a better method is found
    const googleEnabled =
      cloudStatus?.logged_in === true &&
      cloudStatus.prefs.google_enabled === true;
    const alexaEnabled =
      cloudStatus?.logged_in === true &&
      cloudStatus.prefs.alexa_enabled === true;

    const showAssistants = [];
    if (conversationEnabled) {
      showAssistants.push("conversation");
    }
    if (googleEnabled) {
      showAssistants.push("cloud.google_assistant");
    }
    if (alexaEnabled) {
      showAssistants.push("cloud.alexa");
    }
    return showAssistants;
  }
);
