import type { HassEntity } from "home-assistant-js-websocket";
import { isTiltOnly } from "../../data/cover";
import { CoverEntityFeature } from "../../data/feature/cover_entity_feature";
import type { HomeAssistant } from "../../types";
import { canToggleDomain } from "./can_toggle_domain";
import { computeStateDomain } from "./compute_state_domain";
import { supportsFeature } from "./supports-feature";
import { SPECIAL_TOGGLE_ACTIONS } from "./get_toggle_action";

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

  // Tilt-only covers toggle via toggle_cover_tilt, which requires both tilt features
  if (domain === "cover" && isTiltOnly(stateObj)) {
    return [CoverEntityFeature.OPEN_TILT, CoverEntityFeature.CLOSE_TILT].every(
      (f) => supportsFeature(stateObj, f)
    );
  }

  if (
    domain in SPECIAL_TOGGLE_ACTIONS &&
    SPECIAL_TOGGLE_ACTIONS[domain].feature
  ) {
    return SPECIAL_TOGGLE_ACTIONS[domain].feature.every((f) =>
      supportsFeature(stateObj, f)
    );
  }

  return canToggleDomain(hass, domain);
};
