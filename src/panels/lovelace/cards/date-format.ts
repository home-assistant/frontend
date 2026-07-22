import { resolveTimeZone } from "../../../common/datetime/resolve-time-zone";
import type { HomeAssistant } from "../../../types";
import type { ClockCardConfig, DateFormatPart } from "./types";

type DateFormatSeparatorPart = Extract<
  DateFormatPart,
  "separator-dash" | "separator-slash" | "separator-dot" | "separator-new-line"
>;

type DateFormatValuePart = Exclude<DateFormatPart, DateFormatSeparatorPart>;

interface DateFormatSourceConfig {
  date_format?: DateFormatPart[];
}

/**
 * Normalized date configuration used by date format renderers.
 */
interface DateFormatConfig {
  parts: DateFormatPart[];
}

/**
 * Resolves the locale and time zone for a clock card from `hass` and the
 * card's configuration. Applies the optional `time_format` override to the
 * locale and falls back to the user's preferred time zone.
 */
export const resolveClockCardLocale = (
  hass: HomeAssistant,
  config: Pick<ClockCardConfig, "time_format" | "time_zone">
): { locale: HomeAssistant["locale"]; timeZone: string } => {
  const locale = config.time_format
    ? { ...hass.locale, time_format: config.time_format }
    : hass.locale;

  const timeZone =
    config.time_zone ||
    resolveTimeZone(locale.time_zone, hass.config?.time_zone);

  return { locale, timeZone };
};

/**
 * All selectable date tokens exposed by the date format picker.
 */
export const DATE_FORMAT_PARTS: readonly DateFormatPart[] = [
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
  "separator-new-line",
];

const DATE_PART_OPTIONS: Record<
  DateFormatValuePart,
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

const DATE_SEPARATORS: Record<DateFormatSeparatorPart, string> = {
  "separator-dash": "-",
  "separator-slash": "/",
  "separator-dot": ".",
  "separator-new-line": "\n",
};

const DATE_SEPARATOR_PARTS = new Set<DateFormatSeparatorPart>([
  "separator-dash",
  "separator-slash",
  "separator-dot",
  "separator-new-line",
]);

const DATE_PART_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

const isDateFormatPart = (value: string): value is DateFormatPart =>
  DATE_FORMAT_PARTS.includes(value as DateFormatPart);

const isDateSeparatorPart = (
  part: DateFormatPart
): part is DateFormatSeparatorPart =>
  DATE_SEPARATOR_PARTS.has(part as DateFormatSeparatorPart);

/**
 * Returns a reusable formatter for a specific date token.
 */
const getDatePartFormatter = (
  part: DateFormatValuePart,
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
  part: DateFormatValuePart,
  date: Date,
  language: string,
  timeZone?: string
) => getDatePartFormatter(part, language, timeZone).format(date);

/**
 * Applies a single date token to Intl.DateTimeFormat options.
 */
const applyDatePartOption = (
  options: Intl.DateTimeFormatOptions,
  part: DateFormatPart
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
  parts: DateFormatSourceConfig["date_format"]
): DateFormatPart[] =>
  parts?.filter((part): part is DateFormatPart => isDateFormatPart(part)) || [];

/**
 * Returns a normalized date config from a card configuration object.
 */
export const getDateFormatConfig = (
  config?: DateFormatSourceConfig
): DateFormatConfig => ({
  parts: normalizeDateParts(config?.date_format),
});

/**
 * Checks whether the configuration resolves to any visible date output.
 */
export const hasDateFormatParts = (config?: DateFormatSourceConfig): boolean =>
  getDateFormatConfig(config).parts.length > 0;

/**
 * Converts normalized date tokens into Intl.DateTimeFormat options.
 *
 * Separator tokens are ignored. If multiple tokens target the same Intl field,
 * the last one wins.
 */
export const getDateFormatIntlOptions = (
  dateConfig: DateFormatConfig
): Intl.DateTimeFormatOptions => {
  const options: Intl.DateTimeFormatOptions = {};

  dateConfig.parts.forEach((part) => {
    applyDatePartOption(options, part);
  });

  return options;
};

/**
 * Builds the final date string from literal date tokens.
 *
 * Value tokens are localized through Intl.DateTimeFormat. Separator tokens are
 * always rendered literally. A default space is only inserted between adjacent
 * value tokens.
 */
export const formatDateFromParts = (
  date: Date,
  dateConfig: DateFormatConfig,
  language: string,
  timeZone?: string
): string => {
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
