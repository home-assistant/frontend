import { describe, it, expect } from "vitest";
import type { HassEntity } from "home-assistant-js-websocket";
import {
  localizeStateMessage,
  localizeTriggerSource,
  parseTriggerSource,
} from "../../src/data/logbook";
import type { HomeAssistant } from "../../src/types";

const fakeLocalize = ((key: string) => `<${key}>`) as any;

const fakeHass = {
  localize: fakeLocalize,
  formatEntityState: (_stateObj, state: string) => `<state:${state}>`,
} as unknown as HomeAssistant;

const fakeStateObj = {
  entity_id: "button.restart",
  state: "unknown",
  attributes: {},
} as HassEntity;

describe("localizeStateMessage", () => {
  it.each(["unknown", "unavailable"])(
    "preserves the %s lifecycle state for timestamp entities",
    (state) => {
      expect(
        localizeStateMessage(fakeHass, state, fakeStateObj, "button")
      ).toBe(`<state:${state}>`);
    }
  );

  it("uses the action label for a timestamp state", () => {
    expect(
      localizeStateMessage(
        fakeHass,
        "2026-09-15T11:05:05+00:00",
        fakeStateObj,
        "button",
        {
          name: "Restart",
          when: Date.parse("2026-09-15T11:05:05+00:00") / 1000,
        }
      )
    ).toBe("<ui.components.logbook.messages.pressed>");
  });

  it("does not treat a restored timestamp as a new action", () => {
    const restoredState = "2026-09-15T10:55:25+00:00";
    expect(
      localizeStateMessage(fakeHass, restoredState, fakeStateObj, "button", {
        name: "Restart",
        when: Date.parse("2026-09-15T11:05:05+00:00") / 1000,
      })
    ).toBe(`<state:${restoredState}>`);
  });

  it("keeps the action label for a producer timestamp", () => {
    expect(
      localizeStateMessage(
        fakeHass,
        "2026-09-15T10:55:25+00:00",
        fakeStateObj,
        "image",
        {
          name: "Satellite image",
          when: Date.parse("2026-09-15T11:05:05+00:00") / 1000,
        }
      )
    ).toBe("<ui.components.logbook.messages.updated>");
  });
});

describe("localizeTriggerSource", () => {
  it("replaces a known phrase with the bare translation", () => {
    expect(localizeTriggerSource(fakeLocalize, "Home Assistant starting")).toBe(
      "<ui.components.logbook.homeassistant_starting>"
    );
  });

  it("preserves trailing context after the matched phrase", () => {
    expect(
      localizeTriggerSource(fakeLocalize, "state of binary_sensor.foo")
    ).toBe("<ui.components.logbook.state_of> binary_sensor.foo");
  });

  it("matches 'time pattern' before the shorter 'time' phrase", () => {
    expect(localizeTriggerSource(fakeLocalize, "time pattern")).toBe(
      "<ui.components.logbook.time_pattern>"
    );
  });

  it("returns the source unchanged when no phrase matches", () => {
    expect(localizeTriggerSource(fakeLocalize, "something else")).toBe(
      "something else"
    );
  });
});

describe("parseTriggerSource", () => {
  it("extracts the platform and entity id for state triggers", () => {
    expect(parseTriggerSource("state of binary_sensor.foo")).toEqual({
      platform: "state",
      entityId: "binary_sensor.foo",
    });
    expect(parseTriggerSource("numeric state of sensor.bar")).toEqual({
      platform: "numeric_state",
      entityId: "sensor.bar",
    });
  });

  it("returns the platform without an entity for time triggers", () => {
    expect(parseTriggerSource("time pattern")).toEqual({
      platform: "time_pattern",
      entityId: undefined,
    });
    expect(parseTriggerSource("time")).toEqual({
      platform: "time",
      entityId: undefined,
    });
  });

  it("maps Home Assistant start/stop to the homeassistant platform", () => {
    expect(parseTriggerSource("Home Assistant starting")).toEqual({
      platform: "homeassistant",
      entityId: undefined,
    });
  });

  it("returns an empty result when no phrase matches", () => {
    expect(parseTriggerSource("something else")).toEqual({});
  });
});
