import secondsToDuration from "./seconds_to_duration";

const DAY_IN_SECONDS = 86400;
const HOUR_IN_SECONDS = 3600;
const MINUTE_IN_SECONDS = 60;

export const UNIT_TO_SECOND_CONVERT = {
  s: 1,
  min: MINUTE_IN_SECONDS,
  h: HOUR_IN_SECONDS,
  d: DAY_IN_SECONDS,
};

export const formatDuration = (duration: string, units: string): string =>
  secondsToDuration(parseFloat(duration) * UNIT_TO_SECOND_CONVERT[units]) ||
  "0";
