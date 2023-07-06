import {
  mdiArrowDownBold,
  mdiArrowUpBold,
  mdiClockOutline,
  mdiPower,
} from "@mdi/js";
import { stateColorCss } from "../../../../../common/entity/state_color";
import {
  HumidifierAction,
  HumidifierEntity,
  HumidifierState,
} from "../../../../../data/humidifier";
import { ComputeBadgeFunction } from "./tile-badge";

export const HUMIDIFIER_ACTION_ICONS: Record<HumidifierAction, string> = {
  drying: mdiArrowDownBold,
  humidifying: mdiArrowUpBold,
  idle: mdiClockOutline,
  off: mdiPower,
};

export const HUMIDIFIER_ACTION_MODE: Record<HumidifierAction, HumidifierState> =
  {
    drying: "on",
    humidifying: "on",
    idle: "off",
    off: "off",
  };

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
