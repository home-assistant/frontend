import type { HaDurationData } from "../../components/ha-duration-input";
import { durationDataToSeconds } from "./duration_to_seconds";

export interface NormalizedDuration {
  negative: boolean;
  duration: HaDurationData;
}

export interface DurationUnits {
  enableDay: boolean;
  enableSecond: boolean;
  enableMillisecond: boolean;
}

export const normalizeDuration = (
  duration: HaDurationData,
  { enableDay, enableSecond, enableMillisecond }: DurationUnits
): NormalizedDuration => {
  const total = Math.round(durationDataToSeconds(duration) * 1000);
  let rest = Math.abs(total);
  const result: HaDurationData = {};
  if (enableDay) {
    result.days = Math.floor(rest / 86400000);
    rest %= 86400000;
  }
  result.hours = Math.floor(rest / 3600000);
  rest %= 3600000;
  result.minutes = Math.floor(rest / 60000);
  rest %= 60000;
  if (enableMillisecond) {
    result.seconds = Math.floor(rest / 1000);
    result.milliseconds = rest % 1000;
  } else {
    result.seconds = rest / 1000;
  }
  if (!enableSecond && !result.seconds) {
    delete result.seconds;
  }
  return { negative: total < 0, duration: result };
};

export const applyDurationSign = (
  duration: HaDurationData,
  negative: boolean
): HaDurationData => {
  if (!negative) {
    return duration;
  }
  const signed = { ...duration };
  for (const field of Object.keys(signed) as (keyof HaDurationData)[]) {
    if (signed[field]) {
      signed[field] = -signed[field];
    }
  }
  return signed;
};
