import memoizeOne from "memoize-one";
import type { CloudStatus } from "../../../../data/cloud";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import type { HomeAssistant } from "../../../../types";

export const getAvailableAssistants = memoizeOne(
  (cloudStatus: CloudStatus | undefined) => {
    const conversationEnabled = isComponentLoaded(hass, "conversation");
    const googleEnabled =
      cloudStatus?.logged_in === true &&
      cloudStatus.prefs.google_enabled === true;
    const alexaEnabled =
      cloudStatus?.logged_in === true &&
      cloudStatus.prefs.alexa_enabled === true;

    const showAssistants: string[] = [];
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
