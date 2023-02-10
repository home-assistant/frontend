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
      if (parts.length === 1) {
        return { seconds: Number(parts[0]) };
      }
      if (parts.length > 3) {
        return undefined;
      }
      const seconds = Number(parts[2]) || 0;
      const seconds_whole = Math.floor(seconds);
      return {
        hours: Number(parts[0]) || 0,
        minutes: Number(parts[1]) || 0,
        seconds: seconds_whole,
        milliseconds: Math.floor((seconds - seconds_whole) * 1000),
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
