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

const DURATION_FIELDS = [
  ["days", "day"],
  ["hours", "hour"],
  ["minutes", "minute"],
  ["seconds", "second"],
  ["milliseconds", "millisecond"],
] as const satisfies readonly (readonly [keyof HaDurationData, string])[];

type DurationFormatOptions = {
  style: "long" | "narrow" | "digital";
} & Partial<Record<`${keyof HaDurationData}Display`, "always" | "auto">>;

type DurationFormatter = (duration: HaDurationData) => string;

// Throws like Intl.DurationFormat on fractions, NaN and mixed signs
const isNegativeDuration = (duration: HaDurationData) => {
  const values = DURATION_FIELDS.map(([field]) => Number(duration[field] ?? 0));
  const negative = values.some((value) => value < 0);
  if (
    !values.every((value) => Number.isInteger(value)) ||
    (negative && values.some((value) => value > 0))
  ) {
    throw new RangeError("Invalid duration");
  }
  return negative;
};

const fallbackUnitsFormat = (
  language: string,
  options: DurationFormatOptions
): DurationFormatter => {
  const style = options.style === "narrow" ? "narrow" : "long";
  const list = new Intl.ListFormat(language, { type: "unit", style });
  const unitFormats = DURATION_FIELDS.map(
    ([, unit]) =>
      new Intl.NumberFormat(language, {
        style: "unit",
        unit,
        unitDisplay: style,
      })
  );
  return (duration) => {
    const negative = isNegativeDuration(duration);
    const parts: string[] = [];
    DURATION_FIELDS.forEach(([field], index) => {
      const value = Math.abs(duration[field] ?? 0);
      if (value || options[`${field}Display`] === "always") {
        // Like Intl.DurationFormat, only the first unit shows the sign
        parts.push(
          unitFormats[index].format(negative && !parts.length ? -value : value)
        );
      }
    });
    return list.format(parts);
  };
};

const fallbackDigitalFormat = (
  language: string,
  options: DurationFormatOptions
): DurationFormatter => {
  const list = new Intl.ListFormat(language, { type: "unit", style: "short" });
  const dayFormat = new Intl.NumberFormat(language, {
    style: "unit",
    unit: "day",
    unitDisplay: "short",
  });
  const hourFormat = new Intl.NumberFormat(language, { useGrouping: false });
  const twoDigitFormat = new Intl.NumberFormat(language, {
    minimumIntegerDigits: 2,
    maximumFractionDigits: 3,
    useGrouping: false,
  });
  return (duration) => {
    const sign = isNegativeDuration(duration) ? "-" : "";
    const days = Math.abs(duration.days ?? 0);
    const hours = Math.abs(duration.hours ?? 0);
    const minutes = Math.abs(duration.minutes ?? 0);
    const seconds =
      Math.abs(duration.seconds ?? 0) +
      Math.abs(duration.milliseconds ?? 0) / 1000;
    let time = `${twoDigitFormat.format(minutes)}:${twoDigitFormat.format(seconds)}`;
    if (hours || options.hoursDisplay !== "auto") {
      time = `${hourFormat.format(hours)}:${time}`;
    }
    return days
      ? list.format([sign + dayFormat.format(days), time])
      : sign + time;
  };
};

// The Intl.DurationFormat polyfill needs BigInt, which some legacy browsers lack
const createDurationFormat = (
  language: string,
  options: DurationFormatOptions
): DurationFormatter => {
  if ("DurationFormat" in Intl) {
    const durationFormat = new Intl.DurationFormat(language, options);
    return (duration) => durationFormat.format(duration);
  }
  return options.style === "digital"
    ? fallbackDigitalFormat(language, options)
    : fallbackUnitsFormat(language, options);
};

const formatDurationLongMem = memoizeOne((locale: FrontendLocaleData) =>
  createDurationFormat(locale.language, {
    style: "long",
  })
);

export const formatDurationLong = (
  locale: FrontendLocaleData,
  duration: HaDurationData
) => formatDurationLongMem(locale)(duration);

const formatDurationNarrowMem = memoizeOne((locale: FrontendLocaleData) =>
  createDurationFormat(locale.language, {
    style: "narrow",
  })
);

export const formatDurationNarrow = (
  locale: FrontendLocaleData,
  duration: HaDurationData
) => formatDurationNarrowMem(locale)(duration);

const formatDigitalDurationMem = memoizeOne((locale: FrontendLocaleData) =>
  createDurationFormat(locale.language, {
    style: "digital",
    hoursDisplay: "auto",
  })
);

export const formatDurationDigital = (
  locale: FrontendLocaleData,
  duration: HaDurationData
) => formatDigitalDurationMem(locale)(duration);

export const DURATION_UNITS = ["min", "h", "d"] as const;

type DurationUnit = (typeof DURATION_UNITS)[number];

const formatDurationDayMem = memoizeOne((locale: FrontendLocaleData) =>
  createDurationFormat(locale.language, {
    style: "narrow",
    daysDisplay: "always",
  })
);

const formatDurationHourMem = memoizeOne((locale: FrontendLocaleData) =>
  createDurationFormat(locale.language, {
    style: "narrow",
    hoursDisplay: "always",
  })
);

const formatDurationMinuteMem = memoizeOne((locale: FrontendLocaleData) =>
  createDurationFormat(locale.language, {
    style: "narrow",
    minutesDisplay: "always",
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
      const input = {
        days,
        hours,
      };
      return formatDurationDayMem(locale)(input);
    }
    case "h": {
      const hours = Math.floor(value);
      const minutes = Math.floor((value - hours) * 60);
      const input = {
        hours,
        minutes,
      };
      return formatDurationHourMem(locale)(input);
    }
    case "min": {
      const minutes = Math.floor(value);
      const seconds = Math.floor((value - minutes) * 60);
      const input = {
        minutes,
        seconds,
      };
      return formatDurationMinuteMem(locale)(input);
    }
    default:
      throw new Error("Invalid duration unit");
  }
};
