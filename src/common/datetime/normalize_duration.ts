import type { HaDurationData } from "../../components/ha-duration-input";
import { durationDataToSeconds } from "./duration_to_seconds";

export interface NormalizedDuration extends HaDurationData {
  negative: boolean;
}

interface DurationUnits {
  enableDay?: boolean;
  enableSecond?: boolean;
  enableMillisecond?: boolean;
}

export const normalizeDuration = (
  duration: HaDurationData,
  {
    enableDay = true,
    enableSecond = true,
    enableMillisecond = true,
  }: DurationUnits = {}
): NormalizedDuration => {
  const total = Math.round(durationDataToSeconds(duration) * 1000);
  let rest = Math.abs(total);
  const result: NormalizedDuration = { negative: total < 0 };
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
  return result;
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
