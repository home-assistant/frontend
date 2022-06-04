import { HomeAssistant } from "../types";
import { Action } from "./script";

export const callExecuteScript = (
  hass: HomeAssistant,
  sequence: Action | Action[]
) =>
  hass.callWS({
    type: "execute_script",
    sequence,
  });

export const serviceCallWillDisconnect = (domain: string, service: string) =>
  domain === "homeassistant" && ["restart", "stop"].includes(service);

export const serviceDescription = (
  hass: HomeAssistant,
  domain?: string,
  service?: string
) =>
  domain &&
  domain in hass.services &&
  service &&
  service in hass.services[domain]
    ? hass.services[domain][service].description
    : `${domain}.${service}`;
