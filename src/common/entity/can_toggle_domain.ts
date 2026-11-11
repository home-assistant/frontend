import type { HassServices } from "home-assistant-js-websocket";
import { getToggleAction } from "./get_toggle_action";

export const canToggleDomain = (services: HassServices, domain: string) => {
  const domainServices = services[domain];
  if (!domainServices) {
    return false;
  }
  const actionOn = getToggleAction(domain, true);
  const actionOff = getToggleAction(domain, false);
  return actionOn in domainServices && actionOff in domainServices;
};
