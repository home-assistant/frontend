import { describe, expect, it } from "vitest";

import {
  getHiddenFields,
  getHiddenSchemaFields,
  isVisible,
} from "../../../src/components/ha-form/conditions";
import type {
  HaFormSchema,
  HaFormVisible,
} from "../../../src/components/ha-form/types";

describe("isVisible", () => {
  it("shows a field without a visible condition", () => {
    expect(isVisible(undefined, { a: 1 })).toBe(true);
  });

  it("honors a boolean visible", () => {
    expect(isVisible(true, {})).toBe(true);
    expect(isVisible(false, {})).toBe(false);
  });

  describe("operators", () => {
    it("eq (default) matches equal values", () => {
      expect(isVisible({ field: "a", value: 1 }, { a: 1 })).toBe(true);
      expect(isVisible({ field: "a", value: 1 }, { a: 2 })).toBe(false);
    });

    it("not_eq matches different values", () => {
      const visible: HaFormVisible = {
        field: "a",
        operator: "not_eq",
        value: 1,
      };
      expect(isVisible(visible, { a: 2 })).toBe(true);
      expect(isVisible(visible, { a: 1 })).toBe(false);
    });

    it("in matches membership", () => {
      const visible: HaFormVisible = {
        field: "a",
        operator: "in",
        value: ["x", "y"],
      };
      expect(isVisible(visible, { a: "y" })).toBe(true);
      expect(isVisible(visible, { a: "z" })).toBe(false);
    });

    it("not_in matches non-membership", () => {
      const visible: HaFormVisible = {
        field: "a",
        operator: "not_in",
        value: ["x", "y"],
      };
      expect(isVisible(visible, { a: "z" })).toBe(true);
      expect(isVisible(visible, { a: "x" })).toBe(false);
    });

    it("exists matches a defined non-empty value", () => {
      const visible: HaFormVisible = { field: "a", operator: "exists" };
      expect(isVisible(visible, { a: "x" })).toBe(true);
      expect(isVisible(visible, { a: "" })).toBe(false);
      expect(isVisible(visible, {})).toBe(false);
    });

    it("not_exists matches a missing or empty value", () => {
      const visible: HaFormVisible = { field: "a", operator: "not_exists" };
      expect(isVisible(visible, {})).toBe(true);
      expect(isVisible(visible, { a: null } as any)).toBe(true);
      expect(isVisible(visible, { a: "x" })).toBe(false);
    });
  });

  describe("combinators", () => {
    it("and requires every condition", () => {
      const visible: HaFormVisible = {
        condition: "and",
        conditions: [
          { field: "a", value: 1 },
          { field: "b", value: 2 },
        ],
      };
      expect(isVisible(visible, { a: 1, b: 2 })).toBe(true);
      expect(isVisible(visible, { a: 1, b: 9 })).toBe(false);
    });

    it("or requires any condition", () => {
      const visible: HaFormVisible = {
        condition: "or",
        conditions: [
          { field: "a", value: 1 },
          { field: "b", value: 2 },
        ],
      };
      expect(isVisible(visible, { a: 9, b: 2 })).toBe(true);
      expect(isVisible(visible, { a: 9, b: 9 })).toBe(false);
    });

    it("not negates its conditions", () => {
      const visible: HaFormVisible = {
        condition: "not",
        conditions: [{ field: "a", value: 1 }],
      };
      expect(isVisible(visible, { a: 2 })).toBe(true);
      expect(isVisible(visible, { a: 1 })).toBe(false);
    });

    it("nests combinators", () => {
      const visible: HaFormVisible = {
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
      };
      expect(isVisible(visible, { a: 1, b: 9, c: 3 })).toBe(true);
      expect(isVisible(visible, { a: 1, b: 9, c: 9 })).toBe(false);
      expect(isVisible(visible, { a: 9, b: 2, c: 3 })).toBe(false);
    });
  });

  it("treats an array of conditions as AND", () => {
    const visible: HaFormVisible = [
      { field: "a", value: 1 },
      { field: "b", value: 2 },
    ];
    expect(isVisible(visible, { a: 1, b: 2 })).toBe(true);
    expect(isVisible(visible, { a: 1, b: 9 })).toBe(false);
  });

  it("handles missing data", () => {
    expect(isVisible({ field: "a", value: 1 }, undefined)).toBe(false);
  });
});

describe("getHiddenFields", () => {
  it("collects the fields that are not visible", () => {
    const fields = [
      ["mode", undefined],
      ["token", { field: "mode", value: "advanced" }],
    ] as const;
    expect([...getHiddenFields(fields, { mode: "simple" })]).toEqual(["token"]);
    expect([...getHiddenFields(fields, { mode: "advanced" })]).toEqual([]);
  });

  it("treats a hidden field as absent to the other conditions", () => {
    // "token" is hidden, so its value must not satisfy the condition on "extra"
    const fields = [
      ["mode", undefined],
      ["token", { field: "mode", value: "advanced" }],
      ["extra", { field: "token", operator: "exists" }],
    ] as const;
    expect([
      ...getHiddenFields(fields, { mode: "simple", token: "stale" }),
    ]).toEqual(["token", "extra"]);
    expect([
      ...getHiddenFields(fields, { mode: "advanced", token: "kept" }),
    ]).toEqual([]);
  });
});

describe("getHiddenSchemaFields", () => {
  it("reads the visible condition of each schema field", () => {
    const schema = [
      { name: "mode", selector: { text: {} } },
      {
        name: "token",
        selector: { text: {} },
        visible: { field: "mode", value: "advanced" },
      },
    ] as HaFormSchema[];
    expect([...getHiddenSchemaFields(schema, { mode: "simple" })]).toEqual([
      "token",
    ]);
  });
});
