import {
  mdiClockOutline,
  mdiFire,
  mdiPower,
  mdiSnowflake,
  mdiWaterPercent,
} from "@mdi/js";
import { ClimateEntity, HvacAction } from "../../../../../data/climate";
import { ComputeBadgeFunction } from "./tile-badge";

export const CLIMATE_HVAC_ACTION_COLORS: Record<HvacAction, string> = {
  cooling: "var(--rgb-state-climate-cool-color)",
  drying: "var(--rgb-state-climate-dry-color)",
  heating: "var(--rgb-state-climate-heat-color)",
  idle: "var(--rgb-state-climate-idle-color)",
  off: "var(--rgb-state-climate-off-color)",
};

export const CLIMATE_HVAC_ACTION_ICONS: Record<HvacAction, string> = {
  cooling: mdiSnowflake,
  drying: mdiWaterPercent,
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
