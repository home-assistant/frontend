import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
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

const createI18n = (localize: LocalizeFunc) => ({
  localize,
  locale,
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

describe("ha-date-range-picker preset ranges", () => {
  beforeAll(() => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
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
