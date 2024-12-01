import { DurationFormat } from "@formatjs/intl-durationformat";
import type { DurationInput } from "@formatjs/intl-durationformat/src/types";
import memoizeOne from "memoize-one";
import type { FrontendLocaleData } from "../../data/translation";
import { round } from "../number/round";

export const DURATION_UNITS = ["ms", "s", "min", "h", "d"] as const;

type DurationUnit = (typeof DURATION_UNITS)[number];

const formatDurationDayMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new DurationFormat(locale.language, {
      style: "narrow",
      daysDisplay: "always",
    })
);

const formatDurationHourMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new DurationFormat(locale.language, {
      style: "narrow",
      hoursDisplay: "always",
    })
);

const formatDurationMinuteMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new DurationFormat(locale.language, {
      style: "narrow",
      minutesDisplay: "always",
    })
);

const formatDurationSecondMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new DurationFormat(locale.language, {
      style: "narrow",
      secondsDisplay: "always",
    })
);

const formatDurationMillisecondMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new DurationFormat(locale.language, {
      style: "narrow",
      millisecondsDisplay: "always",
    })
);

export const formatDuration = (
  duration: string,
  unit: DurationUnit,
  precision: number | undefined,
  locale: FrontendLocaleData
): string => {
  const value =
    precision !== undefined
      ? round(parseFloat(duration), precision)
      : parseFloat(duration);

  switch (unit) {
    case "d": {
      const days = Math.floor(value);
      const hours = Math.floor((value - days) * 24);
      const input: DurationInput = {
        days,
        hours,
      };
      return formatDurationDayMem(locale).format(input);
    }
    case "h": {
      const hours = Math.floor(value);
      const minutes = Math.floor((value - hours) * 60);
      const input: DurationInput = {
        hours,
        minutes,
      };
      return formatDurationHourMem(locale).format(input);
    }
    case "min": {
      const minutes = Math.floor(value);
      const seconds = Math.floor((value - minutes) * 60);
      const input: DurationInput = {
        minutes,
        seconds,
      };
      return formatDurationMinuteMem(locale).format(input);
    }
    case "s": {
      const seconds = Math.floor(value);
      const milliseconds = Math.floor((value - seconds) * 1000);
      const input: DurationInput = {
        seconds,
        milliseconds,
      };
      return formatDurationSecondMem(locale).format(input);
    }
    case "ms": {
      const milliseconds = Math.floor(value);
      const input: DurationInput = {
        milliseconds,
      };
      return formatDurationMillisecondMem(locale).format(input);
    }
    default:
      throw new Error("Invalid duration unit");
  }
};
