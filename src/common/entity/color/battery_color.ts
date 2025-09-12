export const batteryStateColor = (state: string): string | undefined => {
  const value = Number(state);
  if (isNaN(value)) {
    return undefined;
  }
  if (value >= 70) {
    return "var(--state-sensor-battery-high-color)";
  }
  if (value >= 30) {
    return "var(--state-sensor-battery-medium-color)";
  }
  return "var(--state-sensor-battery-low-color)";
};
