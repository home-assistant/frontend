import { expect, test } from "vitest";
import {
  LOCAL_TIME_ZONE,
  resolveTimeZone,
} from "../../../src/common/datetime/resolve-time-zone";
import { TimeZone } from "../../../src/data/translation";

test("resolveTimeZone", () => {
  const serverTimeZone = "Vienna/Austria";
  expect(resolveTimeZone(TimeZone.local, serverTimeZone)).toBe(LOCAL_TIME_ZONE);
  expect(resolveTimeZone(TimeZone.server, serverTimeZone)).toBe(serverTimeZone);
});
