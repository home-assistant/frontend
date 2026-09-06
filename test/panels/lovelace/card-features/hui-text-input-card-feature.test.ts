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

  it("counts Unicode code points for min/max length", () => {
    const stateObj = entity("input_text.test", { min: 2, max: 2 });
    expect(isTextInputValueValid("😀😀", stateObj)).toBe(true);
  });

  it("accepts a single emoji when max is 1", () => {
    const stateObj = entity("input_text.test", { max: 1 });
    expect(isTextInputValueValid("😀", stateObj)).toBe(true);
  });

  it("accepts any value when no constraints are set", () => {
    const stateObj = entity("input_text.test", {});
    expect(isTextInputValueValid("anything", stateObj)).toBe(true);
  });

  it("accepts a value that matches the pattern", () => {
    const stateObj = entity("text.test", { pattern: "[a-z]+" });
    expect(isTextInputValueValid("hello", stateObj)).toBe(true);
  });

  it("rejects a value that does not match the pattern", () => {
    const stateObj = entity("text.test", { pattern: "[a-z]+" });
    expect(isTextInputValueValid("HELLO123", stateObj)).toBe(false);
  });

  it("respects both length and pattern constraints together", () => {
    const stateObj = entity("text.test", { min: 3, max: 5, pattern: "[a-z]+" });
    expect(isTextInputValueValid("ab", stateObj)).toBe(false);
    expect(isTextInputValueValid("abcdef", stateObj)).toBe(false);
    expect(isTextInputValueValid("ABC", stateObj)).toBe(false);
    expect(isTextInputValueValid("abc", stateObj)).toBe(true);
  });

  it("does not block the value when the pattern is not valid JS regex syntax", () => {
    const stateObj = entity("text.test", { pattern: "(?i)foo" });
    expect(isTextInputValueValid("anything", stateObj)).toBe(true);
  });

  it("accepts any value when no pattern is set", () => {
    const stateObj = entity("input_text.test", {});
    expect(isTextInputValueValid("anything123", stateObj)).toBe(true);
  });

  it("rejects an empty value when min is greater than 0", () => {
    const stateObj = entity("input_text.test", { min: 3 });
    expect(isTextInputValueValid("", stateObj)).toBe(false);
  });
});
