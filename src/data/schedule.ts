import deepClone from "deep-clone-simple";
import memoizeOne from "memoize-one";
import { localizeWeekdays } from "../common/datetime/localize_date";
import { weekdaysFromFirst } from "../common/datetime/sort_weekdays";
import { useAmPm } from "../common/datetime/use_am_pm";
import type { WeekdayLong } from "../common/datetime/weekday";
import {
  WEEKDAY_SHORT_TO_LONG,
  WEEKDAYS_LONG,
} from "../common/datetime/weekday";
import { clamp } from "../common/number/clamp";
import type { HomeAssistant, HomeAssistantApi } from "../types";
import type { FrontendLocaleData } from "./translation";

export type ScheduleWeekday = WeekdayLong;

/** Extra attributes the schedule entity shows while a block is active. */
export type ScheduleBlockData = Record<string, boolean | string | number>;

/** A plain mapping, not a list or a value like a `Date` the YAML parser made. */
const isPlainObject = (value: unknown): value is object => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

// The backend only accepts text, numbers, and booleans as additional data.
export const isScheduleBlockData = (
  value: unknown
): value is ScheduleBlockData =>
  isPlainObject(value) &&
  Object.values(value).every(
    (item) =>
      typeof item === "string" ||
      typeof item === "boolean" ||
      // JSON turns infinite numbers and NaN into null.
      (typeof item === "number" && Number.isFinite(item))
  );

export interface ScheduleBlock {
  from: string;
  to: string;
  data?: ScheduleBlockData;
}

/** All seven days of a schedule, each with its time blocks sorted by start. */
export type ScheduleWeek = Record<ScheduleWeekday, ScheduleBlock[]>;

/** Points to one time block in a `ScheduleWeek`. */
export interface ScheduleBlockRef {
  day: ScheduleWeekday;
  index: number;
}

/** A block being created or edited, shown before it is applied. */
export interface ScheduleBlockPreview {
  block: ScheduleBlock;
  days: ScheduleWeekday[];
  /** The block being edited, which the preview replaces. */
  source?: ScheduleBlockRef;
}

type ScheduleDays = Partial<Record<ScheduleWeekday, ScheduleBlock[]>>;

export interface Schedule extends ScheduleDays {
  id: string;
  name: string;
  icon?: string;
}

export interface ScheduleMutableParams extends ScheduleDays {
  name: string;
  icon: string;
}

export const fetchSchedule = (hass: HomeAssistant) =>
  hass.callWS<Schedule[]>({ type: "schedule/list" });

export const createSchedule = (
  callWS: HomeAssistantApi["callWS"],
  values: ScheduleMutableParams
) =>
  callWS<Schedule>({
    type: "schedule/create",
    ...values,
  });

export const updateSchedule = (
  hass: HomeAssistant,
  id: string,
  updates: Partial<ScheduleMutableParams>
) =>
  hass.callWS<Schedule>({
    type: "schedule/update",
    schedule_id: id,
    ...updates,
  });

export const deleteSchedule = (hass: HomeAssistant, id: string) =>
  hass.callWS({
    type: "schedule/delete",
    schedule_id: id,
  });

/**
 * Fetch the time blocks of any schedule entity, including schedules defined
 * in YAML that are not available through `schedule/list`.
 */
export const fetchScheduleEntityWeek = async (
  callService: HomeAssistantApi["callService"],
  entityId: string
): Promise<ScheduleWeek> => {
  const result = await callService<Record<string, ScheduleDays>>(
    "schedule",
    "get_schedule",
    {},
    { entity_id: entityId },
    false,
    true
  );
  return getScheduleWeek(result.response?.[entityId] ?? {});
};

export const MINUTES_PER_DAY = 24 * 60;

export const SCHEDULE_SNAP_MINUTES = 15;

const DEFAULT_BLOCK_MINUTES = 60;

const pad = (value: number) => value.toString().padStart(2, "0");

/**
 * Convert `HH:MM` or `HH:MM:SS` to minutes since midnight, with seconds as a
 * fraction. `24:00` is 1440.
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes = 0, seconds = 0] = time.split(":").map(Number);
  return clamp(hours * 60 + minutes + seconds / 60, 0, MINUTES_PER_DAY);
};

/** Convert minutes since midnight to `HH:MM`. 1440 becomes `24:00`. */
export const minutesToTime = (minutes: number): string => {
  const value = clamp(Math.round(minutes), 0, MINUTES_PER_DAY);
  return `${pad(Math.floor(value / 60))}:${pad(value % 60)}`;
};

const snapMinutes = (minutes: number): number =>
  Math.round(minutes / SCHEDULE_SNAP_MINUTES) * SCHEDULE_SNAP_MINUTES;

/** Snap down to the previous step, staying inside `range`. */
export const snapDownInRange = (minutes: number, range: MinuteRange): number =>
  clamp(
    Math.floor(minutes / SCHEDULE_SNAP_MINUTES) * SCHEDULE_SNAP_MINUTES,
    range.start,
    range.end
  );

// `schedule.get_schedule` returns the end of the day as Python's `time.max`.
const END_OF_DAY = "23:59:59.999999";

/**
 * Normalize a time to `HH:MM`. An end time of midnight means the end of the
 * day, so it becomes `24:00`. Times with seconds, which only come from the
 * API, keep them, so saving another change does not move them.
 */
export const normalizeScheduleTime = (time: string, isEnd = false): string => {
  const minutes = timeToMinutes(time);
  if (isEnd && (minutes === 0 || time === END_OF_DAY)) {
    return minutesToTime(MINUTES_PER_DAY);
  }
  return Number.isInteger(minutes) ? minutesToTime(minutes) : time;
};

export const normalizeScheduleBlock = (
  block: ScheduleBlock
): ScheduleBlock => ({
  ...block,
  from: normalizeScheduleTime(block.from),
  to: normalizeScheduleTime(block.to, true),
});

const sortScheduleBlocks = (blocks: ScheduleBlock[]): ScheduleBlock[] =>
  [...blocks].sort((a, b) => timeToMinutes(a.from) - timeToMinutes(b.from));

/** Build a complete, normalized and sorted week from a schedule. */
export const getScheduleWeek = (schedule: ScheduleDays): ScheduleWeek =>
  Object.fromEntries(
    WEEKDAYS_LONG.map((day) => [
      day,
      sortScheduleBlocks((schedule[day] ?? []).map(normalizeScheduleBlock)),
    ])
  ) as ScheduleWeek;

/** The days of the week in the user's order. */
export const localeWeekdays = memoizeOne((locale: FrontendLocaleData) =>
  weekdaysFromFirst(locale).map((day) => WEEKDAY_SHORT_TO_LONG[day])
);

export interface MinuteRange {
  start: number;
  end: number;
}

export const blockRange = (block: ScheduleBlock): MinuteRange => ({
  start: timeToMinutes(block.from),
  end: timeToMinutes(block.to),
});

/**
 * The free gap of a day that contains `minute`, ignoring one block.
 * Returns `undefined` when the minute is inside another block.
 */
export const getFreeRange = (
  blocks: ScheduleBlock[],
  minute: number,
  ignoreIndex?: number
): MinuteRange | undefined => {
  let start = 0;
  let end = MINUTES_PER_DAY;
  for (const [index, block] of blocks.entries()) {
    if (index === ignoreIndex) {
      continue;
    }
    const range = blockRange(block);
    if (minute >= range.start && minute < range.end) {
      return undefined;
    }
    if (range.end <= minute) {
      start = Math.max(start, range.end);
    }
    if (range.start > minute) {
      end = Math.min(end, range.start);
    }
  }
  return { start, end };
};

/**
 * The range of a new block created by clicking at `minute`. It starts on the
 * snapped time and lasts an hour, shrinking or shifting to fit the free gap.
 */
export const getNewBlockRange = (
  blocks: ScheduleBlock[],
  minute: number
): MinuteRange | undefined => {
  const gap = getFreeRange(blocks, minute);
  if (!gap) {
    return undefined;
  }
  // Start early enough that a full block still fits before the gap ends.
  const start = snapDownInRange(minute, {
    start: gap.start,
    end: Math.max(gap.start, gap.end - DEFAULT_BLOCK_MINUTES),
  });
  const end = Math.min(start + DEFAULT_BLOCK_MINUTES, gap.end);
  return end > start ? { start, end } : undefined;
};

/** Move a range by whole snap steps without leaving its bounds. */
export const moveRange = (
  range: MinuteRange,
  start: number,
  bounds: MinuteRange
): MinuteRange => {
  const duration = range.end - range.start;
  const newStart = clamp(
    snapMinutes(start),
    bounds.start,
    bounds.end - duration
  );
  return { start: newStart, end: newStart + duration };
};

/** Change the start or end of a range, keeping at least one snap step. */
export const resizeRange = (
  range: MinuteRange,
  edge: "start" | "end",
  minute: number,
  bounds: MinuteRange
): MinuteRange => {
  const snapped = snapMinutes(minute);
  if (edge === "start") {
    const max = Math.max(bounds.start, range.end - SCHEDULE_SNAP_MINUTES);
    return { start: clamp(snapped, bounds.start, max), end: range.end };
  }
  const min = Math.min(bounds.end, range.start + SCHEDULE_SNAP_MINUTES);
  return { start: range.start, end: clamp(snapped, min, bounds.end) };
};

/**
 * Like `minutesToTime`, but keeps the seconds of a range that ends at a
 * neighbor with seconds, so the block does not overlap it.
 */
const rangeTime = (minutes: number): string => {
  const seconds = Math.round(minutes * 60);
  const time = minutesToTime(Math.floor(seconds / 60));
  return seconds % 60 ? `${time}:${pad(seconds % 60)}` : time;
};

export const rangeToBlock = (
  range: MinuteRange,
  block?: ScheduleBlock
): ScheduleBlock => ({
  ...block,
  from: rangeTime(range.start),
  to: rangeTime(range.end),
});

/** Whether two days have the same time blocks, ignoring additional data. */
export const isSameScheduleDay = (
  a: ScheduleBlock[],
  b: ScheduleBlock[]
): boolean =>
  a === b ||
  (a.length === b.length &&
    a.every(
      (block, index) => block.from === b[index].from && block.to === b[index].to
    ));

/** Insert or replace a block on a day. */
export const upsertScheduleBlock = (
  week: ScheduleWeek,
  day: ScheduleWeekday,
  block: ScheduleBlock,
  index?: number
): ScheduleWeek => {
  const blocks = [...week[day]];
  if (index === undefined) {
    blocks.push(block);
  } else {
    blocks[index] = block;
  }
  return { ...week, [day]: sortScheduleBlocks(blocks) };
};

export const removeScheduleBlock = (
  week: ScheduleWeek,
  ref: ScheduleBlockRef
): ScheduleWeek => ({
  ...week,
  [ref.day]: week[ref.day].filter((_, index) => index !== ref.index),
});

/** Find the block on a day that starts at the given time. */
export const findScheduleBlock = (
  week: ScheduleWeek,
  day: ScheduleWeekday,
  from: string
): ScheduleBlockRef | undefined => {
  const index = week[day].findIndex((block) => block.from === from);
  return index === -1 ? undefined : { day, index };
};

/** The days on which a block would overlap another block. */
export const getConflictingDays = (
  week: ScheduleWeek,
  block: ScheduleBlock,
  days: Iterable<ScheduleWeekday>,
  source?: ScheduleBlockRef
): ScheduleWeekday[] => {
  const range = blockRange(block);
  return [...days].filter((day) =>
    week[day].some((other, index) => {
      if (source?.day === day && source.index === index) {
        return false;
      }
      const otherRange = blockRange(other);
      return range.start < otherRange.end && otherRange.start < range.end;
    })
  );
};

/**
 * Place a block on the given days. When editing an existing block, it is
 * removed from its original day first, so it only exists on `days` afterwards.
 */
export const applyScheduleBlock = (
  week: ScheduleWeek,
  block: ScheduleBlock,
  days: Iterable<ScheduleWeekday>,
  source?: ScheduleBlockRef
): ScheduleWeek => {
  let result = source ? removeScheduleBlock(week, source) : week;
  for (const day of days) {
    result = upsertScheduleBlock(result, day, deepClone(block));
  }
  return result;
};

/** Replace the blocks of the target days with copies of the source day. */
export const copyScheduleDay = (
  week: ScheduleWeek,
  source: ScheduleWeekday,
  targets: Iterable<ScheduleWeekday>
): ScheduleWeek => {
  const result = { ...week };
  for (const day of targets) {
    if (day !== source) {
      result[day] = deepClone(week[source]);
    }
  }
  return result;
};

const scheduleTimeFormat = memoizeOne(
  (language: string) =>
    new Intl.DateTimeFormat(language, {
      hour: "numeric",
      minute: "2-digit",
      hourCycle: "h12",
      timeZone: "UTC",
    })
);

const scheduleHourFormat = memoizeOne(
  (language: string) =>
    new Intl.DateTimeFormat(language, {
      hour: "numeric",
      hourCycle: "h12",
      timeZone: "UTC",
    })
);

const minutesToDate = (minutes: number) =>
  new Date(Date.UTC(1970, 0, 1, 0, minutes));

/**
 * Format minutes since midnight for display. Schedules have no time zone, so
 * the time is shown as is. In 24-hour format the end of the day stays `24:00`.
 */
export const formatScheduleTime = (
  minutes: number,
  locale: FrontendLocaleData
): string => {
  if (!useAmPm(locale)) {
    return minutesToTime(minutes);
  }
  return scheduleTimeFormat(locale.language).format(minutesToDate(minutes));
};

/** Short hour label for the timeline axis, like `6 AM` or `06:00`. */
export const formatScheduleHour = (
  hour: number,
  locale: FrontendLocaleData
): string =>
  useAmPm(locale)
    ? scheduleHourFormat(locale.language).format(minutesToDate(hour * 60))
    : minutesToTime(hour * 60);

// Cache both styles per language, since callers alternate between them.
const weekdayNames = memoizeOne((language: string) => ({
  short: localizeWeekdays(language, true),
  long: localizeWeekdays(language, false),
}));

export const formatScheduleWeekday = (
  day: ScheduleWeekday,
  locale: FrontendLocaleData,
  style: "short" | "long" = "long"
): string => weekdayNames(locale.language)[style][WEEKDAYS_LONG.indexOf(day)];
