import type { HaDurationData } from "../../components/ha-duration-input";
import type { ForDict } from "../../data/automation";

export const createDurationData = (
  duration: string | number | ForDict | undefined
): HaDurationData | undefined => {
  if (duration === undefined) {
    return undefined;
  }
  if (typeof duration !== "object") {
    if (typeof duration === "string" || isNaN(duration)) {
      const parts = duration?.toString().split(":") || [];
      return {
        hours: Number(parts[0]) || 0,
        minutes: Number(parts[1]) || 0,
        seconds: Number(parts[2]) || 0,
        milliseconds: Number(parts[3]) || 0,
      };
    }
    return { seconds: duration };
  }
  if (!("days" in duration)) {
    return duration;
  }
  const { days, minutes, seconds, milliseconds } = duration;
  let hours = duration.hours || 0;
  hours = (hours || 0) + (days || 0) * 24;
  return {
    hours,
    minutes,
    seconds,
    milliseconds,
  };
};
