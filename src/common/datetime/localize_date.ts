import memoizeOne from "memoize-one";

// Sunday = 0
const localizeWeekday = (
  language: string,
  day_of_week: number,
  short: boolean
): string => {
  const date = new Date(Date.UTC(1970, 0, 1 + 3 + day_of_week));
  return new Intl.DateTimeFormat(language, {
    weekday: short ? "short" : "long",
    timeZone: "UTC",
  }).format(date);
};

export const localizeWeekdays = memoizeOne(
  (language: string, short: boolean): string[] => {
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(localizeWeekday(language, i, short));
    }
    return days;
  }
);

// January = 0
const localizeMonth = (
  language: string,
  month: number,
  short: boolean
): string => {
  const date = new Date(Date.UTC(1970, 0 + month, 1));
  return new Intl.DateTimeFormat(language, {
    month: short ? "short" : "long",
    timeZone: "UTC",
  }).format(date);
};

export const localizeMonths = memoizeOne(
  (language: string, short: boolean): string[] => {
    const months: string[] = [];
    for (let i = 0; i < 12; i++) {
      months.push(localizeMonth(language, i, short));
    }
    return months;
  }
);
