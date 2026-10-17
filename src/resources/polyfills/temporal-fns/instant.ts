import { zoned } from "./shared";

export interface InstantLite {
  epochMilliseconds: number;
}

export const fromEpochMilliseconds = (
  epochMilliseconds: number
): InstantLite => ({ epochMilliseconds });

export const toZonedDateTimeISO = (instant: InstantLite, timeZone: string) =>
  zoned(instant.epochMilliseconds, timeZone);
