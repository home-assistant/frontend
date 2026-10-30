import { describe, expect, it } from "vitest";
import { dropInvalidConditions } from "../../../src/common/condition/sanitize";
import type { VisibilityCondition } from "../../../src/panels/lovelace/common/validate-condition";

const conds = (c: unknown[]): VisibilityCondition[] =>
  c as VisibilityCondition[];

const state = { condition: "state", entity: "light.kitchen", state: "on" };
const screen = { condition: "screen", media_query: "(max-width: 600px)" };

describe("dropInvalidConditions", () => {
  it("returns the same array when every entry is valid", () => {
    const conditions = conds([
      state,
      { condition: "or", conditions: [screen] },
      { condition: "not", conditions: screen },
    ]);
    expect(dropInvalidConditions(conditions)).toBe(conditions);
  });

  it("drops invalid entries at any depth without changing the input", () => {
    const nested = { condition: "and", conditions: [screen, undefined, 5] };
    const conditions = conds([
      null,
      "screen",
      state,
      { condition: "or", conditions: [null, nested] },
      { condition: "not", conditions: "screen" },
      { condition: "and", conditions: "" },
    ]);

    expect(dropInvalidConditions(conditions)).toEqual([
      state,
      {
        condition: "or",
        conditions: [{ condition: "and", conditions: [screen] }],
      },
      { condition: "not", conditions: [] },
      { condition: "and", conditions: [] },
    ]);
    expect(nested.conditions).toEqual([screen, undefined, 5]);
  });
});
