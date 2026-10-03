import { computeDomain } from "../../../../common/entity/compute_domain";
import { getToggleAction } from "../../../../common/entity/get_toggle_action";
import type { HomeAssistant, ServiceCallResponse } from "../../../../types";

export const turnOnOffEntity = (
  hass: HomeAssistant,
  entityId: string,
  turnOn = true
): Promise<ServiceCallResponse> => {
  const stateDomain = computeDomain(entityId);
  const serviceDomain = stateDomain === "group" ? "homeassistant" : stateDomain;

  const service = getToggleAction(stateDomain, turnOn);

  return hass.callService(serviceDomain, service, { entity_id: entityId });
};
