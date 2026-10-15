import { wallMs, wallToEpochMs, zoned } from "./shared";

export interface PlainDateTimeLite {
  wallMs: number;
}

export const create = (
  year: number,
  month: number,
  day: number,
  hour?: number,
  minute?: number,
  second?: number,
  millisecond?: number
): PlainDateTimeLite => ({
  wallMs: wallMs(year, month, day, hour, minute, second, millisecond),
});

export const toZonedDateTime = (
  plainDateTime: PlainDateTimeLite,
  timeZone: string
) => zoned(wallToEpochMs(plainDateTime.wallMs, timeZone), timeZone);
