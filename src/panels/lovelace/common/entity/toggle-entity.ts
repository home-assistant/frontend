import { STATES_OFF } from "../../../../common/const";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { isTiltOnly } from "../../../../data/cover";
import { UNKNOWN } from "../../../../data/entity/entity";
import type { HomeAssistant, ServiceCallResponse } from "../../../../types";
import { turnOnOffEntity } from "./turn-on-off-entity";

export const toggleEntity = (
  hass: HomeAssistant,
  entityId: string
): Promise<ServiceCallResponse> => {
  const stateObj = hass.states[entityId];

  // Tilt-only covers may not report a state to pick a direction from,
  // let core pick one based on the tilt position instead.
  if (
    computeDomain(entityId) === "cover" &&
    isTiltOnly(stateObj) &&
    stateObj.state === UNKNOWN
  ) {
    return hass.callService("cover", "toggle_cover_tilt", {
      entity_id: entityId,
    });
  }

  const turnOn = STATES_OFF.includes(stateObj.state);
  return turnOnOffEntity(hass, entityId, turnOn);
};
