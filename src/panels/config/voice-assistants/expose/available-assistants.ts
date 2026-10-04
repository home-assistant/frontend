import memoizeOne from "memoize-one";
import type { CloudStatus } from "../../../../data/cloud";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import type { HomeAssistant } from "../../../../types";

// Local Google is an alternative to cloud Google, so only one is ever shown.
// While cloud status is still loading, assume it might be active.
export const showsLocalGoogleAssistant = (
  hass: HomeAssistant,
  cloudStatus: CloudStatus | undefined
): boolean => {
  if (!isComponentLoaded(hass.config, "google_assistant")) {
    return false;
  }
  if (!isComponentLoaded(hass.config, "cloud")) {
    return true;
  }
  if (!cloudStatus) {
    return false;
  }
  return !(cloudStatus.logged_in && cloudStatus.prefs.google_enabled);
};

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

    if (showsLocalGoogleAssistant(hass, cloudStatus)) {
      showAssistants.push("google_assistant");
    }

    return showAssistants;
  }
);
