import {
  mdiClockOutline,
  mdiFan,
  mdiFire,
  mdiPower,
  mdiSnowflake,
  mdiWaterPercent,
} from "@mdi/js";
import { CLIMATE_HVAC_ACTION_COLORS } from "../../../../../common/entity/color/climate_action_colors";
import { ClimateEntity, HvacAction } from "../../../../../data/climate";
import { ComputeBadgeFunction } from "./tile-badge";

export const CLIMATE_HVAC_ACTION_ICONS: Record<HvacAction, string> = {
  cooling: mdiSnowflake,
  drying: mdiWaterPercent,
  fan: mdiFan,
  heating: mdiFire,
  idle: mdiClockOutline,
  off: mdiPower,
};

export const computeClimateBadge: ComputeBadgeFunction = (stateObj) => {
  const hvacAction = (stateObj as ClimateEntity).attributes.hvac_action;

  if (!hvacAction || hvacAction === "off") {
    return undefined;
  }

  return {
    iconPath: CLIMATE_HVAC_ACTION_ICONS[hvacAction],
    color: CLIMATE_HVAC_ACTION_COLORS[hvacAction],
  };
};
