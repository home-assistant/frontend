import type { HomeAssistant } from "../../types";
import { getToggleAction } from "./get_toggle_action";

export const canToggleDomain = (hass: HomeAssistant, domain: string) => {
  const services = hass.services[domain];
  if (!services) {
    return false;
  }
  const actionOn = getToggleAction(domain, true);
  return actionOn in services;
};
