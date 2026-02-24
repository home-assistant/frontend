import type { ClockCardConfig, ClockCardDatePart } from "../types";

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
];

const DATE_PART_GROUPS: Record<
  ClockCardDatePart,
  "weekday" | "day" | "month" | "year" | "separator"
> = {
  "weekday-short": "weekday",
  "weekday-long": "weekday",
  "day-numeric": "day",
  "day-2-digit": "day",
  "month-short": "month",
  "month-long": "month",
  "month-numeric": "month",
  "month-2-digit": "month",
  "year-2-digit": "year",
  "year-numeric": "year",
  "separator-dash": "separator",
  "separator-slash": "separator",
  "separator-dot": "separator",
};

const DATE_PART_OPTIONS: Record<
  ClockCardDatePart,
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
  "separator-dash": {},
  "separator-slash": {},
  "separator-dot": {},
};

const DATE_SEPARATORS: Record<
  Extract<
    ClockCardDatePart,
    "separator-dash" | "separator-slash" | "separator-dot"
  >,
  string
> = {
  "separator-dash": "-",
  "separator-slash": "/",
  "separator-dot": ".",
};

const isClockCardDatePart = (value: string): value is ClockCardDatePart =>
  CLOCK_CARD_DATE_PARTS.includes(value as ClockCardDatePart);

const isDateSeparatorPart = (
  part: ClockCardDatePart
): part is Extract<
  ClockCardDatePart,
  "separator-dash" | "separator-slash" | "separator-dot"
> => DATE_PART_GROUPS[part] === "separator";

const isDateValuePart = (part: ClockCardDatePart): boolean =>
  DATE_PART_GROUPS[part] !== "separator";

/**
 * Maps a date token to the Intl part type used in formatToParts output.
 */
const getDatePartType = (
  part: ClockCardDatePart
): Intl.DateTimeFormatPartTypes => {
  const group = DATE_PART_GROUPS[part];

  if (group === "weekday") {
    return "weekday";
  }

  if (group === "day") {
    return "day";
  }

  if (group === "month") {
    return "month";
  }

  return "year";
};

/**
 * Applies a single date token to Intl.DateTimeFormat options.
 */
const applyDatePartOption = (
  options: Intl.DateTimeFormatOptions,
  part: ClockCardDatePart
) => {
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
 * Sanitizes configured date tokens and keeps at most one variant per group.
 *
 * If multiple variants from the same group are present, the latest one wins
 * and its position defines the final output order.
 */
const normalizeDateParts = (
  parts: ClockCardConfig["date_format"]
): ClockCardDatePart[] => {
  if (!parts) {
    return [];
  }

  const normalized: ClockCardDatePart[] = [];

  parts.forEach((part) => {
    if (!isClockCardDatePart(part)) {
      return;
    }

    const partGroup = DATE_PART_GROUPS[part];

    const existingPartIndex = normalized.findIndex(
      (item) => DATE_PART_GROUPS[item] === partGroup
    );

    if (existingPartIndex !== -1) {
      normalized.splice(existingPartIndex, 1);
    }

    if (!normalized.includes(part)) {
      normalized.push(part);
    }
  });

  return normalized;
};

/**
 * Returns a normalized date config from a card configuration object.
 */
export const getClockCardDateConfig = (
  config?: Pick<ClockCardConfig, "date_format">
): ClockCardDateConfig => ({
  parts: normalizeDateParts(config?.date_format),
});

/**
 * Checks whether the clock configuration resolves to any visible date parts.
 */
export const hasClockCardDate = (
  config?: Pick<ClockCardConfig, "date_format">
): boolean => getClockCardDateConfig(config).parts.some(isDateValuePart);

/**
 * Converts normalized date tokens into Intl.DateTimeFormat options.
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
 * Builds the final date string by reading selected tokens in configured order.
 */
export const formatClockCardDate = (
  dateTimeParts: Intl.DateTimeFormatPart[],
  dateConfig: ClockCardDateConfig
): string => {
  const separatorPart = [...dateConfig.parts]
    .reverse()
    .find((part) => isDateSeparatorPart(part));

  const separator = separatorPart ? DATE_SEPARATORS[separatorPart] : " ";

  const valueParts = dateConfig.parts.filter(isDateValuePart);

  if (valueParts.length === 0) {
    return "";
  }

  return valueParts
    .map((part) => {
      const type = getDatePartType(part);
      return dateTimeParts.find((datePart) => datePart.type === type)?.value;
    })
    .filter((part): part is string => Boolean(part))
    .join(separator);
};
