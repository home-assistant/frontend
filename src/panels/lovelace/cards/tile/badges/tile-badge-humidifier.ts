import { stateColorCss } from "../../../../../common/entity/state_color";
import {
  HUMIDIFIER_ACTION_ICONS,
  HUMIDIFIER_ACTION_MODE,
  HumidifierEntity,
} from "../../../../../data/humidifier";
import { ComputeBadgeFunction } from "./tile-badge";

export const computeHumidifierBadge: ComputeBadgeFunction = (stateObj) => {
  const hvacAction = (stateObj as HumidifierEntity).attributes.action;

  if (!hvacAction || hvacAction === "off") {
    return undefined;
  }

  return {
    iconPath: HUMIDIFIER_ACTION_ICONS[hvacAction],
    color: stateColorCss(stateObj, HUMIDIFIER_ACTION_MODE[hvacAction]),
  };
};
