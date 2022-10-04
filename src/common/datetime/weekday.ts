import { Weekday } from "../../data/translation";

export const weekdays: Weekday[] = [
  Weekday.sun,
  Weekday.mon,
  Weekday.tue,
  Weekday.wed,
  Weekday.thu,
  Weekday.fri,
  Weekday.sat,
];

export const weekdayIndex = (weekday: Weekday): number =>
  weekdays.indexOf(weekday);
