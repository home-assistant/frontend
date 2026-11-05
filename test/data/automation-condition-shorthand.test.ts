import { describe, expect, it } from "vitest";
import { expandConditionWithShorthand } from "../../src/data/automation";

describe("expandConditionWithShorthand", () => {
  it("expands a template string to a template condition", () => {
    expect(
      expandConditionWithShorthand("{{ is_state('sun.sun', 'below_horizon') }}")
    ).toEqual({
      condition: "template",
      value_template: "{{ is_state('sun.sun', 'below_horizon') }}",
    });
  });

  it("expands a condition list to an and condition", () => {
    const conditions = [{ condition: "state", entity_id: "light.kitchen" }];
    expect(
      expandConditionWithShorthand({ condition: conditions } as any)
    ).toEqual({ condition: "and", conditions });
  });

  it("expands building block shorthand", () => {
    const conditions = [{ condition: "state", entity_id: "light.kitchen" }];
    expect(expandConditionWithShorthand({ or: conditions } as any)).toEqual({
      condition: "or",
      conditions,
    });
  });

  it("returns a regular condition unchanged", () => {
    const condition = { condition: "state", entity_id: "light.kitchen" } as any;
    expect(expandConditionWithShorthand(condition)).toBe(condition);
  });
});
