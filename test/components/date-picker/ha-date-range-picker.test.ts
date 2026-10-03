import { nothing } from "lit";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { DateRangePicker } from "../../../src/components/date-picker/date-range-picker";
import "../../../src/components/date-picker/ha-date-range-picker";
import type { HaDateRangePicker } from "../../../src/components/date-picker/ha-date-range-picker";
import {
  DateFormat,
  FirstWeekday,
  NumberFormat,
  TimeFormat,
  TimeZone,
} from "../../../src/data/translation";
import type { LocalizeFunc } from "../../../src/common/translations/localize";

const locale = {
  language: "en",
  number_format: NumberFormat.language,
  time_format: TimeFormat.language,
  date_format: DateFormat.language,
  time_zone: TimeZone.local,
  first_weekday: FirstWeekday.language,
};

const mockConfig = { time_zone: "Etc/UTC" };

const createI18n = (localize: LocalizeFunc, timeZone = TimeZone.local) => ({
  localize,
  locale: { ...locale, time_zone: timeZone },
  language: "en",
});

// Localize behavior before the translation chunk has loaded.
const emptyLocalize: LocalizeFunc = () => "";
// Localize behavior once translations are available.
const loadedLocalize: LocalizeFunc = (key) => String(key).split(".").pop()!;

const createPicker = async (
  localize: LocalizeFunc,
  props: Partial<HaDateRangePicker> = {}
) => {
  const el = document.createElement(
    "ha-date-range-picker"
  ) as HaDateRangePicker;
  el.minimal = true;
  Object.assign(el, props);
  (el as any)._i18n = createI18n(localize);
  // _hassConfig is wrapped by @transform, whose setter picks `.config` off
  // the assigned value, so assign the pre-transform shape.
  (el as any)._hassConfig = { config: mockConfig };
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
};

const rangeKeys = (el: HaDateRangePicker): string[] =>
  Object.keys((el as any)._ranges ?? {});

beforeAll(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as any;
  // jsdom's ElementInternals lacks the validity API used by the
  // webawesome button that renders inside this component.
  const internalsProto = window.ElementInternals.prototype as any;
  internalsProto.setValidity = vi.fn();
  internalsProto.setFormValue = vi.fn();
  Object.defineProperty(internalsProto, "validity", {
    get: () => ({ valid: true }),
    configurable: true,
  });
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ha-date-range-picker preset ranges", () => {
  it("computes labeled ranges when translations are already loaded", async () => {
    const el = await createPicker(loadedLocalize);
    expect(rangeKeys(el)).toEqual(["today", "yesterday", "this_week"]);
  });

  it("recomputes ranges when localize updates after translations load", async () => {
    const el = await createPicker(emptyLocalize);
    // Before translations arrive, every label is "" and entries collapse.
    expect(rangeKeys(el)).toEqual([""]);

    (el as any)._i18n = createI18n(loadedLocalize);
    await el.updateComplete;
    expect(rangeKeys(el)).toEqual(["today", "yesterday", "this_week"]);
  });

  it("recomputes ranges when the timezone config changes", async () => {
    const el = await createPicker(loadedLocalize);
    const before = (el as any)._ranges;

    (el as any)._hassConfig = { config: { time_zone: "America/New_York" } };
    await el.updateComplete;
    expect((el as any)._ranges).not.toBe(before);
    expect(rangeKeys(el)).toEqual(["today", "yesterday", "this_week"]);
  });

  it("includes the extended presets when enabled", async () => {
    const el = await createPicker(loadedLocalize, { extendedPresets: true });
    expect(rangeKeys(el)).toEqual([
      "today",
      "yesterday",
      "this_week",
      "this_month",
      "this_year",
      "now-1h",
      "now-12h",
      "now-24h",
      "now-7d",
      "now-30d",
    ]);
  });
});

// Tests run in Etc/UTC, so a New York server zone differs from the browser's.
const createRangePicker = async (
  timeZone: TimeZone,
  props: Partial<DateRangePicker> = {}
) => {
  const el = document.createElement("date-range-picker") as DateRangePicker;
  // Only the saved range is under test, not the calendar and time inputs.
  (el as any).render = () => nothing;
  Object.assign(el, props);
  (el as any)._i18n = createI18n(loadedLocalize, timeZone);
  (el as any)._hassConfig = { config: { time_zone: "America/New_York" } };
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
};

const saveRange = (el: DateRangePicker) => {
  let value: { startDate: Date; endDate: Date } | undefined;
  el.addEventListener("value-changed", (ev) => {
    value = (ev as CustomEvent).detail.value;
  });
  (el as any)._save();
  return {
    start: value?.startDate.toISOString(),
    end: value?.endDate.toISOString(),
  };
};

describe("date-range-picker time zone", () => {
  it("saves picked days in the server time zone", async () => {
    const el = await createRangePicker(TimeZone.server);
    (el as any)._dateValue = "2026-09-18/2026-09-21";
    expect(saveRange(el)).toEqual({
      start: "2026-09-18T04:00:00.000Z",
      end: "2026-09-22T03:59:00.000Z",
    });
  });

  it("keeps a server time zone range when saved without changes", async () => {
    // 17 Sep 23:30 to 18 Sep 23:30 in New York, the next day in UTC.
    const startDate = new Date("2026-09-18T03:30:00.000Z");
    const endDate = new Date("2026-09-19T03:30:00.000Z");
    const el = await createRangePicker(TimeZone.server, {
      timePicker: true,
      startDate,
      endDate,
    });
    expect(saveRange(el)).toEqual({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });
  });

  it("saves picked days in the browser time zone in local mode", async () => {
    const el = await createRangePicker(TimeZone.local);
    (el as any)._dateValue = "2026-09-18/2026-09-21";
    expect(saveRange(el)).toEqual({
      start: new Date(2026, 8, 18, 0, 0).toISOString(),
      end: new Date(2026, 8, 21, 23, 59).toISOString(),
    });
  });
});
