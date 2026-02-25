import type { ClockCardConfig, ClockCardDatePart } from "../types";

type ClockCardSeparatorPart = Extract<
  ClockCardDatePart,
  "separator-dash" | "separator-slash" | "separator-dot" | "separator-new-line"
>;

type ClockCardValuePart = Exclude<ClockCardDatePart, ClockCardSeparatorPart>;

/**
 * Normalized date configuration used by clock card renderers.
 */
export interface ClockCardDateConfig {
  parts: ClockCardDatePart[];
}

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
  "separator-new-line": "\n",
};

const DATE_SEPARATOR_PARTS = new Set<ClockCardSeparatorPart>([
  "separator-dash",
  "separator-slash",
  "separator-dot",
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
  parts: ClockCardConfig["date_format"]
): ClockCardDatePart[] =>
  parts
    ?.filter((part): part is ClockCardDatePart => isClockCardDatePart(part))
    .slice() || [];

/**
 * Returns a normalized date config from a card configuration object.
 */
export const getClockCardDateConfig = (
  config?: Pick<ClockCardConfig, "date_format">
): ClockCardDateConfig => ({
  parts: normalizeDateParts(config?.date_format),
});

/**
 * Checks whether the clock configuration resolves to any visible date output.
 */
export const hasClockCardDate = (
  config?: Pick<ClockCardConfig, "date_format">
): boolean => getClockCardDateConfig(config).parts.length > 0;

/**
 * Converts normalized date tokens into Intl.DateTimeFormat options.
 *
 * Separator tokens are ignored. If multiple tokens target the same Intl field,
 * the last one wins.
 */
export const getClockCardDateTimeFormatOptions = (
  dateConfig: ClockCardDateConfig
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
export const formatClockCardDate = (
  date: Date,
  dateConfig: ClockCardDateConfig,
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
