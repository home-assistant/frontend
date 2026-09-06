import { describe, expect, it } from "vitest";
import type { HassEntity } from "home-assistant-js-websocket";
import {
  isTextInputValueValid,
  supportsTextInputCardFeature,
} from "../../../../src/panels/lovelace/card-features/hui-text-input-card-feature";
import type { HomeAssistant } from "../../../../src/types";

const entity = (
  entityId: string,
  attributes: HassEntity["attributes"] = {}
): HassEntity =>
  ({
    entity_id: entityId,
    state: "hello",
    attributes,
    last_changed: "",
    last_updated: "",
    context: { id: "", parent_id: null, user_id: null },
  }) as HassEntity;

const hassWith = (...entities: HassEntity[]): HomeAssistant =>
  ({
    states: Object.fromEntries(entities.map((e) => [e.entity_id, e])),
  }) as unknown as HomeAssistant;

describe("supportsTextInputCardFeature", () => {
  it("supports an input_text entity", () => {
    const stateObj = entity("input_text.test");
    const hass = hassWith(stateObj);
    expect(
      supportsTextInputCardFeature(hass, { entity_id: stateObj.entity_id })
    ).toBe(true);
  });

  it("supports a text entity", () => {
    const stateObj = entity("text.test");
    const hass = hassWith(stateObj);
    expect(
      supportsTextInputCardFeature(hass, { entity_id: stateObj.entity_id })
    ).toBe(true);
  });

  it("does not support other domains", () => {
    const stateObj = entity("sensor.test");
    const hass = hassWith(stateObj);
    expect(
      supportsTextInputCardFeature(hass, { entity_id: stateObj.entity_id })
    ).toBe(false);
  });

  it("does not support a context with no entity_id", () => {
    const hass = hassWith();
    expect(supportsTextInputCardFeature(hass, {})).toBe(false);
  });
});

describe("isTextInputValueValid", () => {
  it("accepts a value within min/max length", () => {
    const stateObj = entity("input_text.test", { min: 2, max: 10 });
    expect(isTextInputValueValid("hello", stateObj)).toBe(true);
  });

  it("rejects a value shorter than min", () => {
    const stateObj = entity("input_text.test", { min: 5 });
    expect(isTextInputValueValid("hi", stateObj)).toBe(false);
  });

  it("rejects a value longer than max", () => {
    const stateObj = entity("input_text.test", { max: 3 });
    expect(isTextInputValueValid("hello", stateObj)).toBe(false);
  });

  it("accepts a value fully matching the pattern", () => {
    const stateObj = entity("input_text.test", { pattern: "[0-9]+" });
    expect(isTextInputValueValid("1234", stateObj)).toBe(true);
  });

  it("rejects a value that only partially matches the pattern", () => {
    const stateObj = entity("input_text.test", { pattern: "[0-9]+" });
    expect(isTextInputValueValid("abc1", stateObj)).toBe(false);
  });

  it("accepts any value when no constraints are set", () => {
    const stateObj = entity("input_text.test", {});
    expect(isTextInputValueValid("anything", stateObj)).toBe(true);
  });
});
