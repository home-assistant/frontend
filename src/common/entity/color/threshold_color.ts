const THRESHOLD_STATE_COLORS: Record<string, string> = {
  green: "--state-sensor-threshold-green-color",
  yellow: "--state-sensor-threshold-yellow-color",
  red: "--state-sensor-threshold-red-color",
};

export const thresholdStateColorProperty = (
  state: string
): string | undefined => THRESHOLD_STATE_COLORS[state];
