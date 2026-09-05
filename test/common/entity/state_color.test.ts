import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import {
  isNegativeNumericState,
  stateValueColorCss,
} from "../../../src/common/entity/state_color";

const state = (value: string): HassEntity =>
  ({
    entity_id: "sensor.test",
    state: value,
    attributes: {},
  }) as HassEntity;

describe("stateValueColorCss", () => {
  it("colors negative numeric states only when enabled", () => {
    expect(stateValueColorCss(state("-1.5"), true)).toBe(
      "var(--state-negative-color)"
    );
    expect(stateValueColorCss(state("-1.5"))).toBeUndefined();
  });

  it("does not color non-negative or non-numeric states", () => {
    expect(stateValueColorCss(state("0"), true)).toBeUndefined();
    expect(stateValueColorCss(state("unknown"), true)).toBeUndefined();
  });
});

describe("isNegativeNumericState", () => {
  it("accepts finite negative numbers and rejects other states", () => {
    expect(isNegativeNumericState("-0.01")).toBe(true);
    expect(isNegativeNumericState("0")).toBe(false);
    expect(isNegativeNumericState("-Infinity")).toBe(false);
    expect(isNegativeNumericState("unavailable")).toBe(false);
  });
});
