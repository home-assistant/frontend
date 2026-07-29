import { STATES_OFF } from "../../../../common/const";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { getToggleAction } from "../../../../common/entity/get_toggle_action";
import type { HomeAssistant } from "../../../../types";

export const turnOnOffEntities = (
  hass: HomeAssistant,
  entityIds: string[],
  turnOn = true
): void => {
  const callsToMake: Record<
    string,
    { domain: string; service: string; entityIds: string[] }
  > = {};
  entityIds.forEach((entityId) => {
    const stateObj = hass.states[entityId];
    if (STATES_OFF.includes(stateObj.state) === turnOn) {
      const stateDomain = computeDomain(entityId);
      // Entities with non-standard toggle action need separate calls
      const domain =
        getToggleAction(stateDomain, true) !== "turn_on"
          ? stateDomain
          : "homeassistant";
      // The service can differ per entity, e.g. for tilt-only covers
      const service = getToggleAction(domain, turnOn, stateObj);

      const key = `${domain}.${service}`;
      if (!(key in callsToMake)) {
        callsToMake[key] = { domain, service, entityIds: [] };
      }
      callsToMake[key].entityIds.push(entityId);
    }
  });

  Object.values(callsToMake).forEach(({ domain, service, entityIds: ids }) => {
    hass.callService(domain, service, { entity_id: ids });
  });
};
