import { STATES_OFF } from "../../../../common/const";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { getToggleAction } from "../../../../common/entity/get_toggle_action";
import type { HomeAssistant } from "../../../../types";

export const turnOnOffEntities = (
  hass: HomeAssistant,
  entityIds: string[],
  turnOn = true
): void => {
  const domainsToCall = {};
  entityIds.forEach((entityId) => {
    if (STATES_OFF.includes(hass.states[entityId].state) === turnOn) {
      const stateDomain = computeDomain(entityId);
      // Entities with non-standard toggle action need separate calls
      const serviceDomain =
        getToggleAction(stateDomain, true) !== "turn_on"
          ? stateDomain
          : "homeassistant";

      if (!(serviceDomain in domainsToCall)) {
        domainsToCall[serviceDomain] = [];
      }
      domainsToCall[serviceDomain].push(entityId);
    }
  });

  Object.keys(domainsToCall).forEach((domain) => {
    const service = getToggleAction(domain, turnOn);

    const entities = domainsToCall[domain];
    hass.callService(domain, service, { entity_id: entities });
  });
};
