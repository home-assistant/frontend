import { HomeAssistant } from "../../../types";
import { SubscriptionInfo } from "./types";

export const fetchSubscriptionInfo = (hass: HomeAssistant) =>
  hass.callWS<SubscriptionInfo>({ type: "cloud/subscription" });

export const updatePref = (
  hass: HomeAssistant,
  prefs: {
    google_enabled?: boolean;
    alexa_enabled?: boolean;
    google_allow_unlock?: boolean;
  }
) =>
  hass.callWS({
    type: "cloud/update_prefs",
    ...prefs,
  });
