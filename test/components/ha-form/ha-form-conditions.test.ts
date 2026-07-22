import { describe, expect, it } from "vitest";

import {
  getHiddenFields,
  isFieldVisible,
} from "../../../src/components/ha-form/conditions";
import type { HaFormSchema } from "../../../src/components/ha-form/types";

const field = (visible: HaFormSchema["visible"]): HaFormSchema =>
  ({ name: "field", selector: { text: {} }, visible }) as HaFormSchema;

describe("isFieldVisible", () => {
  it("shows a field without a visible condition", () => {
    expect(isFieldVisible(field(undefined), { a: 1 })).toBe(true);
  });

  it("honors a boolean visible", () => {
    expect(isFieldVisible(field(true), {})).toBe(true);
    expect(isFieldVisible(field(false), {})).toBe(false);
  });

  describe("operators", () => {
    it("eq (default) matches equal values", () => {
      expect(isFieldVisible(field({ field: "a", value: 1 }), { a: 1 })).toBe(
        true
      );
      expect(isFieldVisible(field({ field: "a", value: 1 }), { a: 2 })).toBe(
        false
      );
    });

    it("not_eq matches different values", () => {
      const schema = field({ field: "a", operator: "not_eq", value: 1 });
      expect(isFieldVisible(schema, { a: 2 })).toBe(true);
      expect(isFieldVisible(schema, { a: 1 })).toBe(false);
    });

    it("in matches membership", () => {
      const schema = field({ field: "a", operator: "in", value: ["x", "y"] });
      expect(isFieldVisible(schema, { a: "y" })).toBe(true);
      expect(isFieldVisible(schema, { a: "z" })).toBe(false);
    });

    it("not_in matches non-membership", () => {
      const schema = field({
        field: "a",
        operator: "not_in",
        value: ["x", "y"],
      });
      expect(isFieldVisible(schema, { a: "z" })).toBe(true);
      expect(isFieldVisible(schema, { a: "x" })).toBe(false);
    });

    it("exists matches a defined non-empty value", () => {
      const schema = field({ field: "a", operator: "exists" });
      expect(isFieldVisible(schema, { a: "x" })).toBe(true);
      expect(isFieldVisible(schema, { a: "" })).toBe(false);
      expect(isFieldVisible(schema, {})).toBe(false);
    });

    it("not_exists matches a missing or empty value", () => {
      const schema = field({ field: "a", operator: "not_exists" });
      expect(isFieldVisible(schema, {})).toBe(true);
      expect(isFieldVisible(schema, { a: null } as any)).toBe(true);
      expect(isFieldVisible(schema, { a: "x" })).toBe(false);
    });
  });

  describe("combinators", () => {
    it("and requires every condition", () => {
      const schema = field({
        condition: "and",
        conditions: [
          { field: "a", value: 1 },
          { field: "b", value: 2 },
        ],
      });
      expect(isFieldVisible(schema, { a: 1, b: 2 })).toBe(true);
      expect(isFieldVisible(schema, { a: 1, b: 9 })).toBe(false);
    });

    it("or requires any condition", () => {
      const schema = field({
        condition: "or",
        conditions: [
          { field: "a", value: 1 },
          { field: "b", value: 2 },
        ],
      });
      expect(isFieldVisible(schema, { a: 9, b: 2 })).toBe(true);
      expect(isFieldVisible(schema, { a: 9, b: 9 })).toBe(false);
    });

    it("not negates its conditions", () => {
      const schema = field({
        condition: "not",
        conditions: [{ field: "a", value: 1 }],
      });
      expect(isFieldVisible(schema, { a: 2 })).toBe(true);
      expect(isFieldVisible(schema, { a: 1 })).toBe(false);
    });

    it("nests combinators", () => {
      const schema = field({
        condition: "and",
        conditions: [
          { field: "a", value: 1 },
          {
            condition: "or",
            conditions: [
              { field: "b", value: 2 },
              { field: "c", value: 3 },
            ],
          },
        ],
      });
      expect(isFieldVisible(schema, { a: 1, b: 9, c: 3 })).toBe(true);
      expect(isFieldVisible(schema, { a: 1, b: 9, c: 9 })).toBe(false);
      expect(isFieldVisible(schema, { a: 9, b: 2, c: 3 })).toBe(false);
    });
  });

  it("treats an array of conditions as AND", () => {
    const schema = field([
      { field: "a", value: 1 },
      { field: "b", value: 2 },
    ]);
    expect(isFieldVisible(schema, { a: 1, b: 2 })).toBe(true);
    expect(isFieldVisible(schema, { a: 1, b: 9 })).toBe(false);
  });

  it("handles missing data", () => {
    expect(isFieldVisible(field({ field: "a", value: 1 }), undefined)).toBe(
      false
    );
  });
});

describe("getHiddenFields", () => {
  const named = (
    name: string,
    visible?: HaFormSchema["visible"]
  ): HaFormSchema =>
    ({ name, selector: { text: {} }, visible }) as HaFormSchema;

  it("collects the fields that are not visible", () => {
    const schema = [
      named("mode"),
      named("token", { field: "mode", value: "advanced" }),
    ];
    expect([...getHiddenFields(schema, { mode: "simple" })]).toEqual(["token"]);
    expect([...getHiddenFields(schema, { mode: "advanced" })]).toEqual([]);
  });

  it("treats a hidden field as absent to the other conditions", () => {
    // "token" is hidden, so its value must not satisfy the condition on "extra"
    const schema = [
      named("mode"),
      named("token", { field: "mode", value: "advanced" }),
      named("extra", { field: "token", operator: "exists" }),
    ];
    expect([
      ...getHiddenFields(schema, { mode: "simple", token: "stale" }),
    ]).toEqual(["token", "extra"]);
    expect([
      ...getHiddenFields(schema, { mode: "advanced", token: "kept" }),
    ]).toEqual([]);
  });
});
