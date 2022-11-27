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
