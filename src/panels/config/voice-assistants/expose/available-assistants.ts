import memoizeOne from "memoize-one";
import type { CloudStatus } from "../../../../data/cloud";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import type { HomeAssistant } from "../../../../types";

export const getAvailableAssistants = memoizeOne(
  (cloudStatus: CloudStatus | undefined, hass: HomeAssistant) => {
    const showAssistants: string[] = [];

    if (isComponentLoaded(hass, "conversation")) {
      showAssistants.push("conversation");
    }

    if (cloudStatus?.logged_in) {
      if (cloudStatus.prefs.alexa_enabled) {
        showAssistants.push("cloud.alexa");
      }
      if (cloudStatus.prefs.google_enabled) {
        showAssistants.push("cloud.google_assistant");
      }
    }

    return showAssistants;
  }
);
