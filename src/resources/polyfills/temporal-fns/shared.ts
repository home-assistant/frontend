const DAY_MS = 864e5;

const formatters = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (timeZone: string) => {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    // The FormatJS polyfill can fall back to the user's locale and its digits
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      numberingSystem: "latn",
      calendar: "gregory",
      hour12: false,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
};

export const wallMs = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
) => {
  // Date.UTC maps years 0-99 to 1900-1999
  const date = new Date(
    Date.UTC(2000, month - 1, day, hour, minute, second, millisecond)
  );
  date.setUTCFullYear(year);
  return date.getTime();
};

const offsetMs = (timeZone: string, epochMs: number) => {
  const wholeSecondMs = Math.floor(epochMs / 1000) * 1000;
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, number>> = {};
  for (const part of getFormatter(timeZone).formatToParts(wholeSecondMs)) {
    parts[part.type] = Number(part.value);
  }
  return (
    wallMs(
      parts.year!,
      parts.month!,
      parts.day!,
      parts.hour! % 24,
      parts.minute!,
      parts.second!
    ) - wholeSecondMs
  );
};

export interface ZonedDateTimeLite {
  epochMilliseconds: number;
  offsetNanoseconds: number;
  timeZoneId: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

export const zoned = (
  epochMilliseconds: number,
  timeZone: string
): ZonedDateTimeLite => {
  const offset = offsetMs(timeZone, epochMilliseconds);
  const wall = new Date(epochMilliseconds + offset);
  return {
    epochMilliseconds,
    offsetNanoseconds: offset * 1e6,
    timeZoneId: timeZone,
    year: wall.getUTCFullYear(),
    month: wall.getUTCMonth() + 1,
    day: wall.getUTCDate(),
    hour: wall.getUTCHours(),
    minute: wall.getUTCMinutes(),
    second: wall.getUTCSeconds(),
    millisecond: wall.getUTCMilliseconds(),
  };
};

// Temporal's "compatible" disambiguation: the earlier instant in a fold, the
// later one in a gap
export const wallToEpochMs = (wall: number, timeZone: string) => {
  const offsetBefore = offsetMs(timeZone, wall - DAY_MS);
  const offsetAfter = offsetMs(timeZone, wall + DAY_MS);
  const matches = [wall - offsetBefore, wall - offsetAfter].filter(
    (epochMs) => offsetMs(timeZone, epochMs) === wall - epochMs
  );
  return matches.length ? Math.min(...matches) : wall - offsetBefore;
};
