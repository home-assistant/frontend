import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, it } from "vitest";
import type { Condition, Trigger } from "../../src/data/automation";
import {
  describeCondition,
  describeTrigger,
} from "../../src/data/automation_i18n";
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
  states: {
    "light.kitchen": {
      entity_id: "light.kitchen",
      state: "on",
      attributes: { friendly_name: "Kitchen light" },
    },
    "sensor.temperature": {
      entity_id: "sensor.temperature",
      state: "21",
      attributes: { friendly_name: "Temperature" },
    },
  },
  entities: {},
  formatEntityState: (_stateObj, state?: string) => state ?? "",
} as unknown as HomeAssistant;

const describeRowTrigger = (trigger: Trigger) =>
  describeTrigger(trigger, hass, [], { hideEntities: true });

const describeRowCondition = (condition: Condition) =>
  describeCondition(condition, hass, [], { hideEntities: true });

describe("describing state triggers and conditions", () => {
  const trigger: Trigger = {
    trigger: "state",
    entity_id: "light.kitchen",
    to: "on",
  };
  const condition: Condition = {
    condition: "state",
    entity_id: "light.kitchen",
    state: "on",
  };

  it("names the entities by default", () => {
    expect(describeTrigger(trigger, hass, [])).toBe(
      "When Kitchen light changes to on"
    );
    expect(describeCondition(condition, hass, [])).toBe(
      "If Kitchen light is on"
    );
  });

  it("leaves the entities out when they are rendered as targets", () => {
    expect(describeRowTrigger(trigger)).toBe("State changed to on");
    expect(describeRowCondition(condition)).toBe("State is on");
  });

  it("falls back to the label when nothing is configured yet", () => {
    expect(
      describeRowTrigger({ trigger: "state", entity_id: "light.kitchen" })
    ).toBe("State or any attribute changed");
    expect(
      describeRowCondition({
        condition: "state",
        entity_id: "light.kitchen",
        state: [],
      })
    ).toBe("State");
  });
});

describe("describing numeric state triggers and conditions", () => {
  const trigger: Trigger = {
    trigger: "numeric_state",
    entity_id: "sensor.temperature",
    above: 20,
  };
  const condition: Condition = {
    condition: "numeric_state",
    entity_id: "sensor.temperature",
    above: 20,
  };

  it("names the entities by default", () => {
    expect(describeTrigger(trigger, hass, [])).toBe(
      "When Temperature is above 20"
    );
    expect(describeCondition(condition, hass, [])).toBe(
      "If Temperature is above 20"
    );
  });

  it("leaves the entities out when they are rendered as targets", () => {
    expect(describeRowTrigger(trigger)).toBe("Numeric state crossed above 20");
    expect(describeRowCondition(condition)).toBe("Numeric state is above 20");
  });

  it("describes both thresholds", () => {
    expect(describeRowTrigger({ ...trigger, below: 30 })).toBe(
      "Numeric state crossed above 20 and below 30"
    );
    expect(describeRowCondition({ ...condition, below: 30 })).toBe(
      "Numeric state is above 20 and below 30"
    );
  });

  it("falls back to the label without a threshold", () => {
    expect(
      describeRowTrigger({
        trigger: "numeric_state",
        entity_id: "sensor.temperature",
      })
    ).toBe("Numeric state crossed threshold");
    expect(
      describeRowCondition({
        condition: "numeric_state",
        entity_id: "sensor.temperature",
      })
    ).toBe("Numeric state");
  });
});
