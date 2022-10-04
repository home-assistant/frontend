import { Weekday } from "../../data/translation";

export const weekdays = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const weekdayIndex = (weekday: Weekday): number =>
  weekdays.indexOf(weekday);
