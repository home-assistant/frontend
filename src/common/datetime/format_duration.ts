import { DurationFormat } from "@formatjs/intl-durationformat";
import type { DurationInput } from "@formatjs/intl-durationformat/src/types";
import memoizeOne from "memoize-one";
import type { HaDurationData } from "../../components/ha-duration-input";
import type { FrontendLocaleData } from "../../data/translation";
import { round } from "../number/round";

const leftPad = (num: number) => (num < 10 ? `0${num}` : num);

export const formatNumericDuration = (
  locale: FrontendLocaleData,
  duration: HaDurationData
) => {
  const d = duration.days || 0;
  const h = duration.hours || 0;
  const m = duration.minutes || 0;
  const s = duration.seconds || 0;
  const ms = duration.milliseconds || 0;

  if (d > 0) {
    return `${Intl.NumberFormat(locale.language, {
      style: "unit",
      unit: "day",
      unitDisplay: "long",
    }).format(d)} ${h}:${leftPad(m)}:${leftPad(s)}`;
  }
  if (h > 0) {
    return `${h}:${leftPad(m)}:${leftPad(s)}`;
  }
  if (m > 0) {
    return `${m}:${leftPad(s)}`;
  }
  if (s > 0) {
    return Intl.NumberFormat(locale.language, {
      style: "unit",
      unit: "second",
      unitDisplay: "long",
    }).format(s);
  }
  if (ms > 0) {
    return Intl.NumberFormat(locale.language, {
      style: "unit",
      unit: "millisecond",
      unitDisplay: "long",
    }).format(ms);
  }
  return null;
};

const formatDurationLongMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new DurationFormat(locale.language, {
      style: "long",
    })
);

export const formatDurationLong = (
  locale: FrontendLocaleData,
  duration: HaDurationData
) => formatDurationLongMem(locale).format(duration);

const formatDigitalDurationMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new DurationFormat(locale.language, {
      style: "digital",
      hoursDisplay: "auto",
    })
);

export const formatDurationDigital = (
  locale: FrontendLocaleData,
  duration: HaDurationData
) => formatDigitalDurationMem(locale).format(duration);

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
  locale: FrontendLocaleData,
  duration: string,
  unit: DurationUnit,
  precision?: number | undefined
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
      const milliseconds = value;
      const input: DurationInput = {
        milliseconds,
      };
      return formatDurationMillisecondMem(locale).format(input);
    }
    default:
      throw new Error("Invalid duration unit");
  }
};
