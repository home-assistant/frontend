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
      const durationString = duration.toString().trim();
      // A leading "-" negates the whole period, matching
      // `cv.time_period_str` in core.
      const negative = durationString[0] === "-";
      const parts = durationString
        .split(":")
        .map((part) =>
          negative && part ? -Math.abs(Number(part)) : Number(part)
        );

      if (parts.length === 1) {
        return { seconds: parts[0] };
      }
      if (parts.length > 3) {
        return undefined;
      }
      const seconds = parts[2] || 0;
      const secondsWhole = Math.trunc(seconds);
      return {
        hours: parts[0] || 0,
        minutes: parts[1] || 0,
        seconds: secondsWhole,
        milliseconds: Math.trunc(
          Number((seconds - secondsWhole).toFixed(4)) * 1000
        ),
      };
    }
    return { seconds: duration };
  }
  return duration;
};
