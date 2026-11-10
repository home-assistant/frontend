import { describe, expect, it } from "vitest";
import { computeChooseValues } from "../../../src/components/ha-selector/ha-selector-choose";

describe("computeChooseValues", () => {
  it("puts a plain duration under the active choice", () => {
    const duration = { hours: 0, minutes: 5, seconds: 0 };
    expect(computeChooseValues(duration, "duration")).toEqual({ duration });
  });

  it("puts a plain array under the active choice", () => {
    expect(computeChooseValues(["light.a", "light.b"], "entity")).toEqual({
      entity: ["light.a", "light.b"],
    });
  });

  it("copies a value that already has an active_choice", () => {
    const value = { active_choice: "text", text: "hello", entity: "sun.sun" };
    const values = computeChooseValues(value, "text");
    expect(values).toEqual(value);
    expect(values).not.toBe(value);
  });

  it("starts empty without a value", () => {
    expect(computeChooseValues(undefined, "text")).toEqual({});
    expect(computeChooseValues(null, "text")).toEqual({});
  });
});
