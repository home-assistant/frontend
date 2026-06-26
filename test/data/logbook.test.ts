import { describe, it, expect } from "vitest";
import {
  localizeTriggerSource,
  parseTriggerSource,
} from "../../src/data/logbook";

const fakeLocalize = ((key: string) => `<${key}>`) as any;

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
