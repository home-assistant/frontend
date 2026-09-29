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

const splitSeconds = (
  total: number,
  fields: HaDurationData
): HaDurationData => {
  let rest = total;
  const result: HaDurationData = {};
  if ("days" in fields) {
    result.days = Math.floor(rest / 86400);
    rest -= result.days * 86400;
  }
  result.hours = Math.floor(rest / 3600);
  rest -= result.hours * 3600;
  result.minutes = Math.floor(rest / 60);
  rest -= result.minutes * 60;
  if ("milliseconds" in fields) {
    result.seconds = Math.floor(rest);
    result.milliseconds = Math.round((rest - result.seconds) * 1000);
  } else {
    result.seconds = rest;
  }
  return result;
};

export const normalizeDuration = (
  duration: HaDurationData
): NormalizedDuration => {
  const total = durationDataToSeconds(duration);
  const negative = total < 0;
  const mixed = COMPONENTS.some((field) => {
    const amount = duration[field];
    return amount ? amount < 0 !== negative : false;
  });
  if (mixed) {
    return { negative, ...splitSeconds(Math.abs(total), duration) };
  }
  const components = { ...duration };
  for (const field of COMPONENTS) {
    const amount = components[field];
    if (amount !== undefined) {
      components[field] = Math.abs(amount);
    }
  }
  return { negative, ...components };
};

export const applyDurationSign = (
  duration: HaDurationData,
  negative: boolean
): HaDurationData => {
  if (!negative) {
    return duration;
  }
  const signed = { ...duration };
  for (const field of COMPONENTS) {
    const amount = signed[field];
    if (amount) {
      signed[field] = -amount;
    }
  }
  return signed;
};
