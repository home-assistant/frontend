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

export const absDurationData = (duration: HaDurationData): HaDurationData => {
  const { negative: _negative, ...components } = duration;
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
