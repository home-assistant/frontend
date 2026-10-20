import { expect, test, vi } from "vitest";
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

test("prefers the time zone read before the Intl polyfill loaded", async () => {
  globalThis.__haNativeTimeZone = "Europe/Amsterdam";
  vi.resetModules();
  try {
    const { LOCAL_TIME_ZONE: zone } =
      await import("../../../src/common/datetime/resolve-time-zone");
    expect(zone).toBe("Europe/Amsterdam");
  } finally {
    globalThis.__haNativeTimeZone = undefined;
  }
});
