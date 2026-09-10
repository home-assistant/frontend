import type { HaDurationData } from "../../components/ha-duration-input";

export const durationValueToData = (
  value?: HaDurationData | string | number
): HaDurationData | undefined => {
  if (typeof value === "number") {
    return value < 0
      ? { negative: true, seconds: Math.abs(value) }
      : { seconds: value };
  }
  if (typeof value === "string") {
    const negative = value.trim()[0] === "-";
    const parts = value.split(":").map((p) => Math.abs(Number(p)));
    let data: HaDurationData | undefined;
    if (parts.length === 1) {
      data = { seconds: parts[0] };
    } else if (parts.length === 2) {
      data = { hours: parts[0], minutes: parts[1] };
    } else if (parts.length === 3) {
      data = { hours: parts[0], minutes: parts[1], seconds: parts[2] };
    }
    return data && negative ? { negative: true, ...data } : data;
  }
  return value;
};
