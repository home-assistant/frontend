import { HomeAssistant } from "../types";
import { Action } from "./script";
import { domainToName } from "./integration";

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

export const serviceName = (
  hass: HomeAssistant,
  domain?: string,
  service?: string
) =>
  domain &&
  domain in hass.services &&
  service &&
  service in hass.services[domain] &&
  hass.services[domain][service].name
    ? `${domainToName(hass.localize, domain)}: ${
        hass.services[domain][service].name
      }`
    : `${domain}.${service}`;
