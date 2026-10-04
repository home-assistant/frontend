import {
  addDays,
  addHours,
  addMilliseconds,
  endOfDay,
  startOfDay,
} from "date-fns";
import type { HassConfig } from "home-assistant-js-websocket";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { calcDate } from "../../src/common/datetime/calc_date";
import {
  type FrontendLocaleData,
  NumberFormat,
  TimeFormat,
  FirstWeekday,
  DateFormat,
  TimeZone,
} from "../../src/data/translation";
import {
  getEnergyFirstStatisticAt,
  getEnergyLiveDayPeriod,
  getNextEnergyPeriodStart,
} from "../../src/data/energy";

const locale: FrontendLocaleData = {
  language: "en",
  number_format: NumberFormat.language,
  time_format: TimeFormat.language,
  date_format: DateFormat.language,
  time_zone: TimeZone.server,
  first_weekday: FirstWeekday.language,
};
const tokyoConfig = { time_zone: "Asia/Tokyo" } as HassConfig;

// Dedicated file so Europe/Berlin can be pinned without leaking into other
// suites. Vitest's default TZ is Etc/UTC, where browser-local addDays and
// server-zone math often agree — so UTC CI would miss this regression.
describe("energy period DST (Europe/Berlin local TZ)", () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = "Europe/Berlin";
  });

  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it("uses a DST-fallback browser zone for this file", () => {
    // 24 Oct 2026 is still CEST. If TZ pinning failed, offset is 0 (UTC).
    assert.equal(
      new Date("2026-10-24T14:30:00.000Z").getTimezoneOffset(),
      -120
    );
  });

  it("schedules tomorrow 01:00 in the server zone, not via browser-local addDays", () => {
    // 23:30 JST on 24 Oct 2026. Europe/Berlin falls back on 25 Oct; local
    // addDays(now, 1) then startOfDay in Tokyo skips to 26 Oct 01:00 JST.
    const now = new Date("2026-10-24T14:30:00.000Z");

    // Compare to the tz-internal formula rather than a hardcoded instant:
    // the formula is the production invariant, and a pinned ISO string would
    // not explain why UTC CI cannot catch a raw addDays(now, 1) regression.
    const tzInternal = addHours(
      addMilliseconds(calcDate(now, endOfDay, locale, tokyoConfig), 1),
      1
    );
    const browserLocalAddDays = getEnergyFirstStatisticAt(
      addDays(now, 1),
      locale,
      tokyoConfig
    );
    const actual = getNextEnergyPeriodStart(false, now, locale, tokyoConfig);

    assert.equal(actual.getTime(), tzInternal.getTime());
    assert.notEqual(actual.getTime(), browserLocalAddDays.getTime());
    assert.equal(
      actual.getTime(),
      new Date("2026-10-24T16:00:00.000Z").getTime()
    );
    assert.equal(
      browserLocalAddDays.getTime(),
      new Date("2026-10-25T16:00:00.000Z").getTime()
    );
  });

  it("resolves yesterday in the server zone, not via browser-local addDays", () => {
    // 00:30 JST on 26 Oct 2026. Browser-local addDays can land two days back.
    const now = new Date("2026-10-25T15:30:00.000Z");

    const tzInternal = calcDate(
      calcDate(now, addDays, locale, tokyoConfig, -1),
      startOfDay,
      locale,
      tokyoConfig
    );
    const browserLocalAddDays = calcDate(
      addDays(now, -1),
      startOfDay,
      locale,
      tokyoConfig
    );
    const live = getEnergyLiveDayPeriod(
      false,
      now,
      locale,
      tokyoConfig,
      new Date(0)
    );

    assert.equal(live.start.getTime(), tzInternal.getTime());
    assert.notEqual(live.start.getTime(), browserLocalAddDays.getTime());
  });
});
