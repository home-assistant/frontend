import memoizeOne from "memoize-one";
import { FrontendLocaleData, DateFormat } from "../../data/translation";
import "../../resources/intl-polyfill";

// Tuesday, August 10
export const formatDateWeekdayDay = (
  dateObj: Date,
  locale: FrontendLocaleData
) => formatDateWeekdayDayMem(locale).format(dateObj);

const formatDateWeekdayDayMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
);

// August 10, 2021
export const formatDate = (dateObj: Date, locale: FrontendLocaleData) =>
  formatDateMem(locale).format(dateObj);

const formatDateMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
);

// 10/08/2021
export const formatDateNumeric = (
  dateObj: Date,
  locale: FrontendLocaleData
) => {
  const formatter = formatDateNumericMem(locale);

  if (
    locale.date_format === DateFormat.language ||
    locale.date_format === DateFormat.system
  ) {
    return formatter.format(dateObj);
  }

  const parts = formatter.formatToParts(dateObj);

  const literal = parts.find((value) => value.type === "literal")?.value;
  const day = parts.find((value) => value.type === "day")?.value;
  const month = parts.find((value) => value.type === "month")?.value;
  const year = parts.find((value) => value.type === "year")?.value;

  const lastPart = parts.at(parts.length - 1);
  let lastLiteral = lastPart?.type === "literal" ? lastPart?.value : "";

  if (locale.language === "bg" && locale.date_format === DateFormat.YMD) {
    lastLiteral = "";
  }

  const formats = {
    [DateFormat.DMY]: `${day}${literal}${month}${literal}${year}${lastLiteral}`,
    [DateFormat.MDY]: `${month}${literal}${day}${literal}${year}${lastLiteral}`,
    [DateFormat.YMD]: `${year}${literal}${month}${literal}${day}${lastLiteral}`,
  };

  return formats[locale.date_format];
};

const formatDateNumericMem = memoizeOne((locale: FrontendLocaleData) => {
  const localeString =
    locale.date_format === DateFormat.system ? undefined : locale.language;

  if (
    locale.date_format === DateFormat.language ||
    locale.date_format === DateFormat.system
  ) {
    return new Intl.DateTimeFormat(localeString, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  }

  return new Intl.DateTimeFormat(localeString, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
});

// Aug 10
export const formatDateShort = (dateObj: Date, locale: FrontendLocaleData) =>
  formatDateShortMem(locale).format(dateObj);

const formatDateShortMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      day: "numeric",
      month: "short",
    })
);

// August 2021
export const formatDateMonthYear = (
  dateObj: Date,
  locale: FrontendLocaleData
) => formatDateMonthYearMem(locale).format(dateObj);

const formatDateMonthYearMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      month: "long",
      year: "numeric",
    })
);

// August
export const formatDateMonth = (dateObj: Date, locale: FrontendLocaleData) =>
  formatDateMonthMem(locale).format(dateObj);

const formatDateMonthMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      month: "long",
    })
);

// 2021
export const formatDateYear = (dateObj: Date, locale: FrontendLocaleData) =>
  formatDateYearMem(locale).format(dateObj);

const formatDateYearMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      year: "numeric",
    })
);

// Monday
export const formatDateWeekday = (dateObj: Date, locale: FrontendLocaleData) =>
  formatDateWeekdayMem(locale).format(dateObj);

const formatDateWeekdayMem = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.DateTimeFormat(locale.language, {
      weekday: "long",
    })
);
