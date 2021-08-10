import { HaDurationData } from "../../components/ha-duration-input";
import { ForDict } from "../../data/automation";

export const createDurationData = (
  duration: string | number | ForDict
): HaDurationData => {
  if (!duration) {
    return {};
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
  const { days, minutes, seconds, milliseconds } = duration;
  let hours = duration.hours || 0;
  hours = (hours || 0) + (days || 0) * 24;
  return {
    hours: hours,
    minutes: minutes,
    seconds: seconds,
    milliseconds: milliseconds,
  };
};
