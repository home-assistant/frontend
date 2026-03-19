export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type WeekdayShort =
  | "sun"
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat";

export type WeekdayLong =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export const WEEKDAYS_SHORT = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const satisfies readonly WeekdayShort[];

export const WEEKDAYS_LONG = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const satisfies readonly WeekdayLong[];

export const WEEKDAY_MAP = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
} as const satisfies Record<WeekdayIndex, WeekdayShort>;

export const WEEKDAY_SHORT_TO_LONG = {
  sun: "sunday",
  mon: "monday",
  tue: "tuesday",
  wed: "wednesday",
  thu: "thursday",
  fri: "friday",
  sat: "saturday",
} as const satisfies Record<WeekdayShort, WeekdayLong>;
