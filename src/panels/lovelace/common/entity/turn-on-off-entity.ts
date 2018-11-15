import computeDomain from "../../../../common/entity/compute_domain";
import { HomeAssistant } from "../../../../types";

export const turnOnOffEntity = (
  hass: HomeAssistant,
  entityId: string,
  turnOn = true
): void => {
  const stateDomain = computeDomain(entityId);
  const serviceDomain = stateDomain === "group" ? "homeassistant" : stateDomain;

  let service;
  switch (stateDomain) {
    case "lock":
      service = turnOn ? "unlock" : "lock";
      break;
    case "cover":
      service = turnOn ? "open_cover" : "close_cover";
      break;
    default:
      service = turnOn ? "turn_on" : "turn_off";
  }

  hass.callService(serviceDomain, service, { entity_id: entityId });
};
