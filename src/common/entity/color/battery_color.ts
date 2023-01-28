export const batteryStateColorProperty = (
  state: string
): string | undefined => {
  const value = Number(state);
  if (isNaN(value)) {
    return undefined;
  }
  if (value >= 67) {
    return "--state-sensor-battery-high-color";
  }
  if (value >= 34) {
    return "--state-sensor-battery-medium-color";
  }
  return "--state-sensor-battery-low-color";
};
