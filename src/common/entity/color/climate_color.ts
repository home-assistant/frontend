import { HvacAction } from "../../../data/climate";

export const CLIMATE_HVAC_ACTION_COLORS: Record<HvacAction, string> = {
  cooling: "var(--state-climate-cool-color)",
  drying: "var(--state-climate-dry-color)",
  fan: "var(--state-climate-fan-only-color)",
  heating: "var(--state-climate-heat-color)",
  idle: "var(--state-climate-idle-color)",
  off: "var(--state-climate-off-color)",
};
