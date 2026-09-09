import memoizeOne from "memoize-one";
import type { CloudStatus } from "../../../../data/cloud";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import type { HomeAssistant } from "../../../../types";

// The local Google Assistant integration is an alternative to cloud's
// Google Assistant support, so only one of the two is ever shown.
export const showsLocalGoogleAssistant = (
  hass: HomeAssistant,
  cloudGoogleActive: boolean
): boolean =>
  !cloudGoogleActive && isComponentLoaded(hass.config, "google_assistant");

export const getAvailableAssistants = memoizeOne(
  (cloudStatus: CloudStatus | undefined, hass: HomeAssistant) => {
    const showAssistants: string[] = [];

    if (isComponentLoaded(hass.config, "conversation")) {
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

    if (
      showsLocalGoogleAssistant(
        hass,
        showAssistants.includes("cloud.google_assistant")
      )
    ) {
      showAssistants.push("google_assistant");
    }

    return showAssistants;
  }
);
