import { resolveTimeZone } from "../../../../common/datetime/resolve-time-zone";
import type { FrontendLocaleData } from "../../../../data/translation";
import type {
  ClockCardConfig,
  ClockCardDatePart,
  ClockCardDatePreset,
} from "../types";

type ClockCardSeparatorPart = Extract<ClockCardDatePart, `separator-${string}`>;

type ClockCardValuePart = Exclude<ClockCardDatePart, ClockCardSeparatorPart>;

/**
 * Normalized date configuration used by clock card renderers. A preset wins
 * over parts.
 */
interface ClockCardDateConfig {
  parts: ClockCardDatePart[];
  preset?: ClockCardDatePreset;
}

/**
 * Date presets offered before the custom parts editor. `short` to `full`
 * follow the locale's standard date styles, `iso` is ISO 8601 (YYYY-MM-DD).
 */
export const CLOCK_CARD_DATE_PRESETS: readonly ClockCardDatePreset[] = [
  "short",
  "medium",
  "long",
  "full",
  "iso",
];

const ISO_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
};

const DATE_PRESET_OPTIONS: Record<
  ClockCardDatePreset,
  Intl.DateTimeFormatOptions
> = {
  short: { dateStyle: "short" },
  medium: { dateStyle: "medium" },
  long: { dateStyle: "long" },
  full: { dateStyle: "full" },
  iso: ISO_DATE_OPTIONS,
};

export const isClockCardDatePreset = (
  value: unknown
): value is ClockCardDatePreset =>
  CLOCK_CARD_DATE_PRESETS.some((preset) => preset === value);

/**
 * Resolves the locale and time zone for a clock card from the user's locale,
 * the server time zone and the card's configuration. Applies the optional
 * `time_format` override to the locale and falls back to the user's preferred
 * time zone.
 */
export const resolveClockCardLocale = (
  userLocale: FrontendLocaleData,
  serverTimeZone: string,
  config: Pick<ClockCardConfig, "time_format" | "time_zone">
): { locale: FrontendLocaleData; timeZone: string } => {
  const locale = config.time_format
    ? { ...userLocale, time_format: config.time_format }
    : userLocale;

  const timeZone =
    config.time_zone || resolveTimeZone(locale.time_zone, serverTimeZone);

  return { locale, timeZone };
};

/**
 * All selectable date tokens exposed by the clock card editor.
 */
export const CLOCK_CARD_DATE_PARTS: readonly ClockCardDatePart[] = [
  "weekday-short",
  "weekday-long",
  "day-numeric",
  "day-2-digit",
  "month-short",
  "month-long",
  "month-numeric",
  "month-2-digit",
  "year-2-digit",
  "year-numeric",
  "separator-dash",
  "separator-slash",
  "separator-dot",
  "separator-comma",
  "separator-new-line",
];

const DATE_PART_OPTIONS: Record<
  ClockCardValuePart,
  Pick<Intl.DateTimeFormatOptions, "weekday" | "day" | "month" | "year">
> = {
  "weekday-short": { weekday: "short" },
  "weekday-long": { weekday: "long" },
  "day-numeric": { day: "numeric" },
  "day-2-digit": { day: "2-digit" },
  "month-short": { month: "short" },
  "month-long": { month: "long" },
  "month-numeric": { month: "numeric" },
  "month-2-digit": { month: "2-digit" },
  "year-2-digit": { year: "2-digit" },
  "year-numeric": { year: "numeric" },
};

const DATE_SEPARATORS: Record<ClockCardSeparatorPart, string> = {
  "separator-dash": "-",
  "separator-slash": "/",
  "separator-dot": ".",
  // A comma always reads with a space after it, as in "Thursday, 29 October".
  "separator-comma": ", ",
  "separator-new-line": "\n",
};

const DATE_SEPARATOR_PARTS = new Set<ClockCardSeparatorPart>([
  "separator-dash",
  "separator-slash",
  "separator-dot",
  "separator-comma",
  "separator-new-line",
]);

const DATE_PART_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

const isClockCardDatePart = (value: string): value is ClockCardDatePart =>
  CLOCK_CARD_DATE_PARTS.includes(value as ClockCardDatePart);

const isDateSeparatorPart = (
  part: ClockCardDatePart
): part is ClockCardSeparatorPart =>
  DATE_SEPARATOR_PARTS.has(part as ClockCardSeparatorPart);

/**
 * Returns a reusable formatter for a specific date token.
 */
const getDatePartFormatter = (
  part: ClockCardValuePart,
  language: string,
  timeZone?: string
): Intl.DateTimeFormat => {
  const cacheKey = `${language}|${timeZone || ""}|${part}`;
  const cached = DATE_PART_FORMATTERS.get(cacheKey);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat(language, {
    ...DATE_PART_OPTIONS[part],
    ...(timeZone ? { timeZone } : {}),
  });

  DATE_PART_FORMATTERS.set(cacheKey, formatter);

  return formatter;
};

const formatDatePart = (
  part: ClockCardValuePart,
  date: Date,
  language: string,
  timeZone?: string
) => getDatePartFormatter(part, language, timeZone).format(date);

/**
 * Applies a single date token to Intl.DateTimeFormat options.
 */
const applyDatePartOption = (
  options: Intl.DateTimeFormatOptions,
  part: ClockCardDatePart
) => {
  if (isDateSeparatorPart(part)) {
    return;
  }

  const partOptions = DATE_PART_OPTIONS[part];

  if (partOptions.weekday) {
    options.weekday = partOptions.weekday;
  }

  if (partOptions.day) {
    options.day = partOptions.day;
  }

  if (partOptions.month) {
    options.month = partOptions.month;
  }

  if (partOptions.year) {
    options.year = partOptions.year;
  }
};

/**
 * Sanitizes configured date tokens while preserving their literal order.
 */
const normalizeDateParts = (
  parts: ClockCardDatePart[] | undefined
): ClockCardDatePart[] =>
  parts?.filter((part): part is ClockCardDatePart =>
    isClockCardDatePart(part)
  ) || [];

/**
 * Returns a normalized date config from a card configuration object.
 */
export const getClockCardDateConfig = (
  config?: Pick<ClockCardConfig, "date_format">
): ClockCardDateConfig => {
  const dateFormat = config?.date_format;

  if (isClockCardDatePreset(dateFormat)) {
    return { parts: [], preset: dateFormat };
  }

  return {
    parts: normalizeDateParts(Array.isArray(dateFormat) ? dateFormat : []),
  };
};

/**
 * Checks whether the clock configuration resolves to any visible date output.
 */
export const hasClockCardDate = (
  config?: Pick<ClockCardConfig, "date_format">
): boolean => {
  const dateConfig = getClockCardDateConfig(config);

  return !!dateConfig.preset || dateConfig.parts.length > 0;
};

/**
 * Converts a normalized date config into Intl.DateTimeFormat options.
 *
 * Separator tokens are ignored. If multiple tokens target the same Intl field,
 * the last one wins.
 */
export const getClockCardDateTimeFormatOptions = (
  dateConfig: ClockCardDateConfig
): Intl.DateTimeFormatOptions => {
  if (dateConfig.preset) {
    return { ...DATE_PRESET_OPTIONS[dateConfig.preset] };
  }

  const options: Intl.DateTimeFormatOptions = {};

  dateConfig.parts.forEach((part) => {
    applyDatePartOption(options, part);
  });

  return options;
};

const DATE_PRESET_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

const getDatePresetFormatter = (
  preset: ClockCardDatePreset,
  language: string,
  timeZone?: string
): Intl.DateTimeFormat => {
  const cacheKey = `${language}|${timeZone || ""}|${preset}`;
  const cached = DATE_PRESET_FORMATTERS.get(cacheKey);

  if (cached) {
    return cached;
  }

  // ISO 8601 is fixed: Gregorian calendar and Latin digits in any language.
  const isIso = preset === "iso";

  const options: Intl.DateTimeFormatOptions = isIso
    ? { ...ISO_DATE_OPTIONS, calendar: "iso8601", numberingSystem: "latn" }
    : { ...DATE_PRESET_OPTIONS[preset] };

  if (timeZone) {
    options.timeZone = timeZone;
  }

  const formatter = new Intl.DateTimeFormat(isIso ? "en" : language, options);

  DATE_PRESET_FORMATTERS.set(cacheKey, formatter);

  return formatter;
};

/**
 * Formats a date with one of the presets.
 */
export const formatClockCardDatePreset = (
  date: Date,
  preset: ClockCardDatePreset,
  language: string,
  timeZone?: string
): string => {
  const formatter = getDatePresetFormatter(preset, language, timeZone);

  if (preset !== "iso") {
    return formatter.format(date);
  }

  const values: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};

  formatter.formatToParts(date).forEach(({ type, value }) => {
    values[type] = value;
  });

  return `${values.year}-${values.month}-${values.day}`;
};

const PRESET_REFERENCE_DATE = new Date(Date.UTC(2026, 0, 5, 12));

const INLINE_SEPARATOR_PARTS = [
  "separator-dash",
  "separator-slash",
  "separator-dot",
  "separator-comma",
] as const satisfies readonly ClockCardSeparatorPart[];

/**
 * Approximates a preset as custom date parts in the given language, so
 * switching from a preset to custom starts from what the user already sees.
 * Literal text the parts can't express, such as commas, is dropped.
 */
export const getClockCardDatePresetParts = (
  preset: ClockCardDatePreset,
  language: string
): ClockCardDatePart[] => {
  if (preset === "iso") {
    return [
      "year-numeric",
      "separator-dash",
      "month-2-digit",
      "separator-dash",
      "day-2-digit",
    ];
  }

  // Compares only the field itself, as standalone formats can add text around
  // it, such as "05日" for a Japanese day.
  const formatUtcField = (
    formatter: Intl.DateTimeFormat,
    fieldType: Intl.DateTimeFormatPartTypes
  ) =>
    formatter
      .formatToParts(PRESET_REFERENCE_DATE)
      .find(({ type }) => type === fieldType)?.value;

  const formatUtc = (
    part: ClockCardValuePart,
    fieldType: Intl.DateTimeFormatPartTypes
  ) => formatUtcField(getDatePartFormatter(part, language, "UTC"), fieldType);

  // Some languages, such as Polish and Russian, inflect the month next to a
  // day ("5 stycznia"), so it differs from the standalone form ("styczeń").
  const formatMonthWithDay = (part: ClockCardValuePart) =>
    formatUtcField(
      new Intl.DateTimeFormat(language, {
        ...DATE_PART_OPTIONS[part],
        day: "numeric",
        timeZone: "UTC",
      }),
      "month"
    );

  const parts: ClockCardDatePart[] = [];

  getDatePresetFormatter(preset, language, "UTC")
    .formatToParts(PRESET_REFERENCE_DATE)
    .forEach(({ type, value }) => {
      switch (type) {
        case "weekday":
          parts.push(
            value === formatUtc("weekday-long", type)
              ? "weekday-long"
              : "weekday-short"
          );
          break;
        case "day":
          parts.push(
            value === formatUtc("day-2-digit", type)
              ? "day-2-digit"
              : "day-numeric"
          );
          break;
        case "month":
          parts.push(
            (
              [
                "month-2-digit",
                "month-numeric",
                "month-long",
                "month-short",
              ] as const
            ).find(
              (part) =>
                value === formatUtc(part, type) ||
                value === formatMonthWithDay(part)
            ) ?? "month-short"
          );
          break;
        case "year":
          parts.push(
            value === formatUtc("year-2-digit", type)
              ? "year-2-digit"
              : "year-numeric"
          );
          break;
        case "literal": {
          const separator = INLINE_SEPARATOR_PARTS.find(
            (part) => value.trim() === DATE_SEPARATORS[part].trim()
          );

          if (separator) {
            parts.push(separator);
          }

          break;
        }
      }
    });

  return parts;
};

/**
 * Builds the final date string from literal date tokens.
 *
 * Value tokens are localized through Intl.DateTimeFormat. Separator tokens are
 * always rendered literally. A default space is only inserted between adjacent
 * value tokens.
 */
export const formatClockCardDate = (
  date: Date,
  dateConfig: ClockCardDateConfig,
  language: string,
  timeZone?: string
): string => {
  if (dateConfig.preset) {
    return formatClockCardDatePreset(
      date,
      dateConfig.preset,
      language,
      timeZone
    );
  }

  let result = "";
  let previousRenderedPartWasValue = false;

  dateConfig.parts.forEach((part) => {
    if (isDateSeparatorPart(part)) {
      result += DATE_SEPARATORS[part];
      previousRenderedPartWasValue = false;
      return;
    }

    const value = formatDatePart(part, date, language, timeZone);

    if (!value) {
      return;
    }

    if (previousRenderedPartWasValue) {
      result += " ";
    }

    result += value;
    previousRenderedPartWasValue = true;
  });

  return result;
};
