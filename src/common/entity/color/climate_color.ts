import { HvacAction } from "../../../data/climate";

export const CLIMATE_HVAC_ACTION_COLORS: Record<HvacAction, string> = {
  cooling: "var(--rgb-state-climate-cool-color)",
  drying: "var(--rgb-state-climate-dry-color)",
  fan: "var(--rgb-state-climate-fan-only-color)",
  heating: "var(--rgb-state-climate-heat-color)",
  idle: "var(--rgb-state-climate-idle-color)",
  off: "var(--rgb-state-climate-off-color)",
};

export const climateColor = (state: string): string | undefined => {
  switch (state) {
    case "auto":
      return "climate-auto";
    case "cool":
      return "climate-cool";
    case "dry":
      return "climate-dry";
    case "fan_only":
      return "climate-fan-only";
    case "heat":
      return "climate-heat";
    case "heat_cool":
      return "climate-heat-cool";
    default:
      return undefined;
  }
};
