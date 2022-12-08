export const batteryStateColor = (state: string) => {
  const value = Number(state);
  if (isNaN(value)) {
    return "sensor-battery-unknown";
  }
  if (value >= 70) {
    return "sensor-battery-high";
  }
  if (value >= 30) {
    return "sensor-battery-medium";
  }
  return "sensor-battery-low";
};
