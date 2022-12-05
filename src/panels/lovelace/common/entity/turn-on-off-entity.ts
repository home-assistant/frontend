import { computeDomain } from "../../../../common/entity/compute_domain";
import { HomeAssistant, ServiceCallResponse } from "../../../../types";

export const turnOnOffEntity = (
  hass: HomeAssistant,
  entityId: string,
  turnOn = true
): Promise<ServiceCallResponse> => {
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
    case "button":
    case "input_button":
      service = "press";
      break;
    case "scene":
      service = "turn_on";
      break;
    default:
      service = turnOn ? "turn_on" : "turn_off";
  }

  return hass.callService(serviceDomain, service, { entity_id: entityId });
};
