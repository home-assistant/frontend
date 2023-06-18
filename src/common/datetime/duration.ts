import millisecondsToDuration from "./milliseconds_to_duration";

const DAY_IN_MILLISECONDS = 86400000;
const HOUR_IN_MILLISECONDS = 3600000;
const MINUTE_IN_MILLISECONDS = 60000;
const SECOND_IN_MILLISECONDS = 1000;

export const UNIT_TO_MILLISECOND_CONVERT = {
  ms: 1,
  s: SECOND_IN_MILLISECONDS,
  min: MINUTE_IN_MILLISECONDS,
  h: HOUR_IN_MILLISECONDS,
  d: DAY_IN_MILLISECONDS,
};

export const formatDuration = (duration: string, units: string): string =>
  millisecondsToDuration(
    parseFloat(duration) * UNIT_TO_MILLISECOND_CONVERT[units]
  ) || "0";
