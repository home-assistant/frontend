import type { HaDurationData } from "../../components/ha-duration-input";
import { durationDataToSeconds } from "./duration_to_seconds";

const COMPONENTS = [
  "days",
  "hours",
  "minutes",
  "seconds",
  "milliseconds",
] as const;

export const isNegativeDuration = (duration: HaDurationData): boolean =>
  duration.negative ?? durationDataToSeconds(duration) < 0;

const hasMixedSigns = (duration: HaDurationData): boolean => {
  const signs = new Set(
    COMPONENTS.map((field) => Math.sign(duration[field] ?? 0)).filter(
      (sign) => sign !== 0
    )
  );
  return signs.size > 1;
};

const splitSeconds = (
  totalSeconds: number,
  template: HaDurationData
): HaDurationData => {
  let rest = totalSeconds;
  const result: HaDurationData = {};
  if (template.days !== undefined) {
    result.days = Math.floor(rest / 86400);
    rest %= 86400;
  }
  result.hours = Math.floor(rest / 3600);
  rest %= 3600;
  result.minutes = Math.floor(rest / 60);
  rest %= 60;
  result.seconds = Math.floor(rest);
  if (template.milliseconds !== undefined) {
    result.milliseconds = Math.round((rest - result.seconds) * 1000);
  }
  return result;
};

export const absDurationData = (duration: HaDurationData): HaDurationData => {
  const { negative: _negative, ...components } = duration;
  if (_negative === undefined && hasMixedSigns(components)) {
    return splitSeconds(
      Math.abs(durationDataToSeconds(components)),
      components
    );
  }
  for (const field of COMPONENTS) {
    const amount = components[field];
    if (amount !== undefined) {
      components[field] = Math.abs(amount);
    }
  }
  return components;
};

export const isValidDurationData = (duration: HaDurationData): boolean =>
  COMPONENTS.every((field) => {
    const amount = duration[field];
    return amount === undefined || Number.isFinite(amount);
  });

export const signedDurationToSeconds = (duration: HaDurationData): number =>
  duration.negative === undefined
    ? durationDataToSeconds(duration)
    : (duration.negative ? -1 : 1) *
      durationDataToSeconds(absDurationData(duration));
