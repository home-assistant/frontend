import type { HassEntity } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../../types";
import { canToggleDomain } from "./can_toggle_domain";
import { computeStateDomain } from "./compute_state_domain";
import { supportsFeature } from "./supports-feature";
import { getSpecialToggleAction } from "./get_toggle_action";

export const canToggleState = (hass: HomeAssistant, stateObj: HassEntity) => {
  const domain = computeStateDomain(stateObj);

  if (domain === "group") {
    if (
      stateObj.attributes?.entity_id?.some((entity) => {
        const entityStateObj = hass.states[entity];
        if (!entityStateObj) {
          return false;
        }

        const entityDomain = computeStateDomain(entityStateObj);
        return canToggleDomain(hass, entityDomain);
      })
    ) {
      return stateObj.state === "on" || stateObj.state === "off";
    }

    return false;
  }

  const toggleAction = getSpecialToggleAction(domain, stateObj);

  if (toggleAction?.feature) {
    return toggleAction.feature.every((f) => supportsFeature(stateObj, f));
  }

  return canToggleDomain(hass, domain);
};
