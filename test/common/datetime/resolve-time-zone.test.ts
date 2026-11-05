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

test.each([
  ["Europe/Amsterdam", "Europe/Amsterdam"],
  // An alias the zone list lacks, so Intl's own name is used
  ["Asia/Calcutta", LOCAL_TIME_ZONE],
])("resolves the native time zone %s", async (native, expected) => {
  globalThis.__haNativeTimeZone = native;
  vi.resetModules();
  try {
    const { LOCAL_TIME_ZONE: zone, HAS_RESOLVED_IANA_TIME_ZONE: resolved } =
      await import("../../../src/common/datetime/resolve-time-zone");
    expect(zone).toBe(expected);
    expect(resolved).toBe(true);
  } finally {
    globalThis.__haNativeTimeZone = undefined;
  }
});
