import { _adapters } from "chart.js";
import {
  startOfSecond,
  startOfMinute,
  startOfHour,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  addMilliseconds,
  addSeconds,
  addMinutes,
  addHours,
  addDays,
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
  differenceInMilliseconds,
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInQuarters,
  differenceInYears,
  endOfSecond,
  endOfMinute,
  endOfHour,
  endOfDay,
  endOfWeek,
  endOfMonth,
  endOfQuarter,
  endOfYear,
} from "date-fns/esm";
import {
  formatDate,
  formatDateMonth,
  formatDateMonthYear,
  formatDateVeryShort,
  formatDateWeekdayDay,
  formatDateYear,
} from "../../common/datetime/format_date";
import {
  formatDateTime,
  formatDateTimeWithSeconds,
} from "../../common/datetime/format_date_time";
import {
  formatTime,
  formatTimeWithSeconds,
} from "../../common/datetime/format_time";

const FORMATS = {
  datetime: "datetime",
  datetimeseconds: "datetimeseconds",
  millisecond: "millisecond",
  second: "second",
  minute: "minute",
  hour: "hour",
  day: "day",
  date: "date",
  weekday: "weekday",
  week: "week",
  month: "month",
  monthyear: "monthyear",
  quarter: "quarter",
  year: "year",
};

_adapters._date.override({
  formats: () => FORMATS,
  parse: (value: Date | number) => {
    if (!(value instanceof Date)) {
      return value;
    }
    return value.getTime();
  },
  format: function (time, fmt: keyof typeof FORMATS) {
    switch (fmt) {
      case "datetime":
        return formatDateTime(
          new Date(time),
          this.options.locale,
          this.options.config
        );
      case "datetimeseconds":
        return formatDateTimeWithSeconds(
          new Date(time),
          this.options.locale,
          this.options.config
        );
      case "millisecond":
        return formatTimeWithSeconds(
          new Date(time),
          this.options.locale,
          this.options.config
        );
      case "second":
        return formatTimeWithSeconds(
          new Date(time),
          this.options.locale,
          this.options.config
        );
      case "minute":
        return formatTime(
          new Date(time),
          this.options.locale,
          this.options.config
        );
      case "hour":
        return formatTime(
          new Date(time),
          this.options.locale,
          this.options.config
        );
      case "weekday":
        return formatDateWeekdayDay(
          new Date(time),
          this.options.locale,
          this.options.config
        );
      case "date":
        return formatDate(
          new Date(time),
          this.options.locale,
          this.options.config
        );
      case "day":
        return formatDateVeryShort(
          new Date(time),
          this.options.locale,
          this.options.config
        );
      case "week":
        return formatDateVeryShort(
          new Date(time),
          this.options.locale,
          this.options.config
        );
      case "month":
        return formatDateMonth(
          new Date(time),
          this.options.locale,
          this.options.config
        );
      case "monthyear":
        return formatDateMonthYear(
          new Date(time),
          this.options.locale,
          this.options.config
        );
      case "quarter":
        return formatDate(
          new Date(time),
          this.options.locale,
          this.options.config
        );
      case "year":
        return formatDateYear(
          new Date(time),
          this.options.locale,
          this.options.config
        );
      default:
        return "";
    }
  },
  // @ts-ignore
  add: (time, amount, unit) => {
    switch (unit) {
      case "millisecond":
        return addMilliseconds(time, amount);
      case "second":
        return addSeconds(time, amount);
      case "minute":
        return addMinutes(time, amount);
      case "hour":
        return addHours(time, amount);
      case "day":
        return addDays(time, amount);
      case "week":
        return addWeeks(time, amount);
      case "month":
        return addMonths(time, amount);
      case "quarter":
        return addQuarters(time, amount);
      case "year":
        return addYears(time, amount);
      default:
        return time;
    }
  },
  diff: (max, min, unit) => {
    switch (unit) {
      case "millisecond":
        return differenceInMilliseconds(max, min);
      case "second":
        return differenceInSeconds(max, min);
      case "minute":
        return differenceInMinutes(max, min);
      case "hour":
        return differenceInHours(max, min);
      case "day":
        return differenceInDays(max, min);
      case "week":
        return differenceInWeeks(max, min);
      case "month":
        return differenceInMonths(max, min);
      case "quarter":
        return differenceInQuarters(max, min);
      case "year":
        return differenceInYears(max, min);
      default:
        return 0;
    }
  },
  // @ts-ignore
  startOf: (time, unit, weekday) => {
    switch (unit) {
      case "second":
        return startOfSecond(time);
      case "minute":
        return startOfMinute(time);
      case "hour":
        return startOfHour(time);
      case "day":
        return startOfDay(time);
      case "week":
        return startOfWeek(time);
      case "isoWeek":
        return startOfWeek(time, {
          weekStartsOn: +weekday! as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        });
      case "month":
        return startOfMonth(time);
      case "quarter":
        return startOfQuarter(time);
      case "year":
        return startOfYear(time);
      default:
        return time;
    }
  },
  // @ts-ignore
  endOf: (time, unit) => {
    switch (unit) {
      case "second":
        return endOfSecond(time);
      case "minute":
        return endOfMinute(time);
      case "hour":
        return endOfHour(time);
      case "day":
        return endOfDay(time);
      case "week":
        return endOfWeek(time);
      case "month":
        return endOfMonth(time);
      case "quarter":
        return endOfQuarter(time);
      case "year":
        return endOfYear(time);
      default:
        return time;
    }
  },
});
