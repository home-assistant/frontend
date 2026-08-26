import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, it } from "vitest";
import { describeCondition } from "../../src/data/automation_i18n";
import {
  DateFormat,
  FirstWeekday,
  NumberFormat,
  TimeFormat,
  TimeZone,
} from "../../src/data/translation";
import en from "../../src/translations/en.json";
import type { HomeAssistant } from "../../src/types";

type TranslationNode = string | { [key: string]: TranslationNode };

const localize = (key: string, values?: Record<string, unknown>) => {
  const message = key
    .split(".")
    .reduce<TranslationNode | undefined>(
      (translations, part) =>
        typeof translations === "object" ? translations[part] : undefined,
      en as TranslationNode
    );
  return typeof message === "string"
    ? (new IntlMessageFormat(message, "en").format(values) as string)
    : "";
};

const hass = {
  localize,
  locale: {
    language: "en",
    number_format: NumberFormat.language,
    time_format: TimeFormat.twenty_four,
    date_format: DateFormat.language,
    first_weekday: FirstWeekday.language,
    time_zone: TimeZone.local,
  },
  config: { time_zone: "Etc/UTC" },
  states: {},
} as unknown as HomeAssistant;

const describeTimeCondition = (after?: string, before?: string) =>
  describeCondition({ condition: "time", after, before }, hass, []);

describe("time condition description", () => {
  it("joins a window within one day with 'and'", () => {
    expect(describeTimeCondition("09:00:00", "17:00:00")).toBe(
      "If the time is after 09:00 and before 17:00"
    );
  });

  it("joins a window crossing midnight with 'or'", () => {
    expect(describeTimeCondition("22:00:00", "06:00:00")).toBe(
      "If the time is after 22:00 or before 06:00"
    );
  });

  it("omits a 'before' boundary of midnight, which ends the window at the end of the day", () => {
    expect(describeTimeCondition("10:00:00", "00:00:00")).toBe(
      "If the time is after 10:00"
    );
  });

  it("compares times numerically, not lexicographically", () => {
    expect(describeTimeCondition("9:00:00", "10:00:00")).toBe(
      "If the time is after 09:00 and before 10:00"
    );
  });

  it("does not compare entity references", () => {
    expect(describeTimeCondition("input_datetime.wake_up", "10:00:00")).toBe(
      "If the time is after entity input_datetime.wake_up and before 10:00"
    );
  });
});
