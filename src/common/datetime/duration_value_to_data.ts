import type { HaDurationData } from "../../components/ha-duration-input";

export const durationValueToData = (
  value?: HaDurationData | string | number
): HaDurationData | undefined => {
  if (typeof value === "number") {
    return { seconds: value };
  }
  if (typeof value === "string") {
    const negative = value.trim()[0] === "-";
    const parts = value
      .split(":")
      .map((p) => (negative && p ? -Math.abs(Number(p)) : Number(p)));

    if (parts.length === 1) {
      return { seconds: parts[0] };
    }
    if (parts.length === 2) {
      return { hours: parts[0], minutes: parts[1] };
    }
    if (parts.length === 3) {
      return {
        hours: parts[0],
        minutes: parts[1],
        seconds: parts[2],
      };
    }
    return undefined;
  }
  return value;
};
