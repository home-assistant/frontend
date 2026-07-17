import { describe, expect, it } from "vitest";

import { isFieldHidden } from "../../../src/components/ha-form/conditions";
import type { HaFormSchema } from "../../../src/components/ha-form/types";

const field = (hidden: HaFormSchema["hidden"]): HaFormSchema =>
  ({ name: "field", selector: { text: {} }, hidden }) as HaFormSchema;

describe("isFieldHidden", () => {
  it("shows a field without a hidden condition", () => {
    expect(isFieldHidden(field(undefined), { a: 1 })).toBe(false);
  });

  it("honors a boolean hidden", () => {
    expect(isFieldHidden(field(true), {})).toBe(true);
    expect(isFieldHidden(field(false), {})).toBe(false);
  });

  describe("operators", () => {
    it("eq (default) matches equal values", () => {
      expect(isFieldHidden(field({ field: "a", value: 1 }), { a: 1 })).toBe(
        true
      );
      expect(isFieldHidden(field({ field: "a", value: 1 }), { a: 2 })).toBe(
        false
      );
    });

    it("not_eq matches different values", () => {
      const schema = field({ field: "a", operator: "not_eq", value: 1 });
      expect(isFieldHidden(schema, { a: 2 })).toBe(true);
      expect(isFieldHidden(schema, { a: 1 })).toBe(false);
    });

    it("in matches membership", () => {
      const schema = field({ field: "a", operator: "in", value: ["x", "y"] });
      expect(isFieldHidden(schema, { a: "y" })).toBe(true);
      expect(isFieldHidden(schema, { a: "z" })).toBe(false);
    });

    it("not_in matches non-membership", () => {
      const schema = field({
        field: "a",
        operator: "not_in",
        value: ["x", "y"],
      });
      expect(isFieldHidden(schema, { a: "z" })).toBe(true);
      expect(isFieldHidden(schema, { a: "x" })).toBe(false);
    });

    it("exists matches a defined non-empty value", () => {
      const schema = field({ field: "a", operator: "exists" });
      expect(isFieldHidden(schema, { a: "x" })).toBe(true);
      expect(isFieldHidden(schema, { a: "" })).toBe(false);
      expect(isFieldHidden(schema, {})).toBe(false);
    });

    it("not_exists matches a missing or empty value", () => {
      const schema = field({ field: "a", operator: "not_exists" });
      expect(isFieldHidden(schema, {})).toBe(true);
      expect(isFieldHidden(schema, { a: null } as any)).toBe(true);
      expect(isFieldHidden(schema, { a: "x" })).toBe(false);
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
      expect(isFieldHidden(schema, { a: 1, b: 2 })).toBe(true);
      expect(isFieldHidden(schema, { a: 1, b: 9 })).toBe(false);
    });

    it("or requires any condition", () => {
      const schema = field({
        condition: "or",
        conditions: [
          { field: "a", value: 1 },
          { field: "b", value: 2 },
        ],
      });
      expect(isFieldHidden(schema, { a: 9, b: 2 })).toBe(true);
      expect(isFieldHidden(schema, { a: 9, b: 9 })).toBe(false);
    });

    it("not negates its conditions", () => {
      const schema = field({
        condition: "not",
        conditions: [{ field: "a", value: 1 }],
      });
      expect(isFieldHidden(schema, { a: 2 })).toBe(true);
      expect(isFieldHidden(schema, { a: 1 })).toBe(false);
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
      expect(isFieldHidden(schema, { a: 1, b: 9, c: 3 })).toBe(true);
      expect(isFieldHidden(schema, { a: 1, b: 9, c: 9 })).toBe(false);
      expect(isFieldHidden(schema, { a: 9, b: 2, c: 3 })).toBe(false);
    });
  });

  it("treats an array of conditions as AND", () => {
    const schema = field([
      { field: "a", value: 1 },
      { field: "b", value: 2 },
    ]);
    expect(isFieldHidden(schema, { a: 1, b: 2 })).toBe(true);
    expect(isFieldHidden(schema, { a: 1, b: 9 })).toBe(false);
  });

  it("handles missing data", () => {
    expect(isFieldHidden(field({ field: "a", value: 1 }), undefined)).toBe(
      false
    );
  });
});
