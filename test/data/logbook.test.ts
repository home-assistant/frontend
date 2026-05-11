import { describe, it, expect } from "vitest";
import {
  localizeTriggerDescription,
  localizeTriggerSource,
} from "../../src/data/logbook";

const fakeLocalize = ((key: string) => `<${key}>`) as any;

describe("localizeTriggerSource", () => {
  it("replaces a known phrase with the prefixed translation", () => {
    expect(localizeTriggerSource(fakeLocalize, "Home Assistant starting")).toBe(
      "<ui.components.logbook.triggered_by_homeassistant_starting>"
    );
  });

  it("preserves trailing context after the matched phrase", () => {
    expect(
      localizeTriggerSource(fakeLocalize, "state of binary_sensor.foo")
    ).toBe("<ui.components.logbook.triggered_by_state_of> binary_sensor.foo");
  });

  it("returns the source unchanged when no phrase matches", () => {
    expect(localizeTriggerSource(fakeLocalize, "something else")).toBe(
      "something else"
    );
  });
});

describe("localizeTriggerDescription", () => {
  it("returns just the bare-phrase translation, without 'triggered by'", () => {
    expect(
      localizeTriggerDescription(fakeLocalize, "Home Assistant starting")
    ).toBe("<ui.components.logbook.homeassistant_starting>");
  });

  it("preserves trailing context after the matched phrase", () => {
    expect(
      localizeTriggerDescription(fakeLocalize, "state of binary_sensor.foo")
    ).toBe("<ui.components.logbook.state_of> binary_sensor.foo");
  });

  it("returns the source unchanged when no phrase matches", () => {
    expect(localizeTriggerDescription(fakeLocalize, "something else")).toBe(
      "something else"
    );
  });
});
