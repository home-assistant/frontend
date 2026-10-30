import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, it } from "vitest";
import type { ForDict } from "../../src/data/automation";
import { describeTrigger } from "../../src/data/automation_i18n";
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

describe("legacy calendar trigger offset description", () => {
  it.each([
    [
      "-01:30:00",
      "When it's 1 hour, 30 minutes before a calendar event starts",
    ],
    [
      { hours: 1, minutes: -30 },
      "When it's 30 minutes after a calendar event starts",
    ],
    [
      { seconds: 1.5 },
      "When it's 1 second, 500 milliseconds after a calendar event starts",
    ],
    [{ hours: 0, minutes: 0, seconds: 0 }, "When a calendar event starts"],
  ])("describes %j", (offset, expected) => {
    expect(
      describeTrigger(
        {
          trigger: "calendar",
          event: "start",
          entity_id: "",
          offset: offset as string | ForDict,
        },
        hass,
        []
      )
    ).toBe(expected);
  });
});

describe("legacy sun trigger offset description", () => {
  it.each([
    [{ minutes: -30 }, "When the sun sets offset by -30:00"],
    [{ hours: 1, minutes: -30 }, "When the sun sets offset by +30:00"],
    [{ hours: 0, minutes: 0, seconds: 0 }, "When the sun sets"],
  ])("describes %j", (offset, expected) => {
    expect(
      describeTrigger({ trigger: "sun", event: "sunset", offset }, hass, [])
    ).toBe(expected);
  });
});
