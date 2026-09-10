import type { HaDurationData } from "../../components/ha-duration-input";
import { durationDataToSeconds } from "./duration_to_seconds";

const COMPONENTS = [
  "days",
  "hours",
  "minutes",
  "seconds",
  "milliseconds",
] as const;

export interface NormalizedDuration extends HaDurationData {
  negative: boolean;
}

const hasMixedSigns = (duration: HaDurationData): boolean =>
  new Set(
    COMPONENTS.map((field) => Math.sign(duration[field] ?? 0)).filter(
      (sign) => sign !== 0
    )
  ).size > 1;

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

export const normalizeDuration = (
  duration: HaDurationData
): NormalizedDuration => {
  const { negative, ...components } = duration;
  if (negative !== undefined) {
    return { negative, ...components };
  }
  const total = durationDataToSeconds(components);
  if (hasMixedSigns(components)) {
    return {
      negative: total < 0,
      ...splitSeconds(Math.abs(total), components),
    };
  }
  for (const field of COMPONENTS) {
    const amount = components[field];
    if (amount !== undefined) {
      components[field] = Math.abs(amount);
    }
  }
  return { negative: total < 0, ...components };
};
