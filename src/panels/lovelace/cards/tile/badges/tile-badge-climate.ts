import {
  mdiClockOutline,
  mdiFan,
  mdiFire,
  mdiPower,
  mdiSnowflake,
  mdiWaterPercent,
} from "@mdi/js";
import { stateColorCss } from "../../../../../common/entity/state_color";
import {
  ClimateEntity,
  HvacAction,
  HvacMode,
} from "../../../../../data/climate";
import { ComputeBadgeFunction } from "./tile-badge";

export const CLIMATE_HVAC_ACTION_ICONS: Record<HvacAction, string> = {
  cooling: mdiSnowflake,
  drying: mdiWaterPercent,
  fan: mdiFan,
  heating: mdiFire,
  idle: mdiClockOutline,
  off: mdiPower,
};

export const CLIMATE_HVAC_ACTION_MODE: Record<HvacAction, HvacMode> = {
  cooling: "cool",
  drying: "dry",
  fan: "fan_only",
  heating: "heat",
  idle: "off",
  off: "off",
};

export const computeClimateBadge: ComputeBadgeFunction = (stateObj) => {
  const hvacAction = (stateObj as ClimateEntity).attributes.hvac_action;

  if (!hvacAction || hvacAction === "off") {
    return undefined;
  }

  return {
    iconPath: CLIMATE_HVAC_ACTION_ICONS[hvacAction],
    color: stateColorCss(stateObj, CLIMATE_HVAC_ACTION_MODE[hvacAction]),
  };
};
