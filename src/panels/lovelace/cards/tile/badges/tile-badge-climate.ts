import { stateColorCss } from "../../../../../common/entity/state_color";
import {
  CLIMATE_HVAC_ACTION_ICONS,
  CLIMATE_HVAC_ACTION_TO_MODE,
  ClimateEntity,
} from "../../../../../data/climate";
import { ComputeBadgeFunction } from "./tile-badge";

export const computeClimateBadge: ComputeBadgeFunction = (stateObj) => {
  const hvacAction = (stateObj as ClimateEntity).attributes.hvac_action;

  if (!hvacAction || hvacAction === "off") {
    return undefined;
  }

  return {
    iconPath: CLIMATE_HVAC_ACTION_ICONS[hvacAction],
    color: stateColorCss(stateObj, CLIMATE_HVAC_ACTION_TO_MODE[hvacAction]),
  };
};
