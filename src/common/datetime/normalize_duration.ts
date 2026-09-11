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

export const normalizeDuration = (
  duration: HaDurationData
): NormalizedDuration => {
  const { negative, ...components } = duration;
  if (negative !== undefined) {
    return { negative, ...components };
  }
  for (const field of COMPONENTS) {
    const amount = components[field];
    if (amount !== undefined) {
      components[field] = Math.abs(amount);
    }
  }
  return { negative: durationDataToSeconds(duration) < 0, ...components };
};
