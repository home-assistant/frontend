import type { HaDurationData } from "../../components/ha-duration-input";
import type { ForDict } from "../../data/automation";

export const createDurationData = (
  duration: string | number | ForDict | undefined,
  enableDay = false,
  enableMillisecond = true
): HaDurationData | undefined => {
  if (duration === undefined) {
    return undefined;
  }
  if (typeof duration !== "object") {
    if (typeof duration === "string" || isNaN(duration)) {
      const durationString = duration.toString().trim();
      const negative = durationString[0] === "-";
      const parts = (durationString.split(":") || []).map((p) =>
        negative && p ? -Math.abs(Number(p)) : Number(p)
      );

      if (parts.length === 1) {
        return { seconds: parts[0] };
      }
      if (parts.length > 3) {
        return undefined;
      }
      if (!enableMillisecond) {
        return {
          hours: parts[0] || 0,
          minutes: parts[1] || 0,
          seconds: parts[2] || 0,
        };
      }
      const seconds = parts[2] || 0;
      const seconds_whole = Math.trunc(seconds);
      return {
        hours: parts[0] || 0,
        minutes: parts[1] || 0,
        seconds: seconds_whole,
        milliseconds: Math.trunc(
          Number((seconds - seconds_whole).toFixed(4)) * 1000
        ),
      };
    }
    return { seconds: duration };
  }
  if (!("days" in duration) || enableDay) {
    return duration;
  }
  const { days, ...result } = duration;
  result.hours = (duration.hours || 0) + (days || 0) * 24;
  return result;
};
