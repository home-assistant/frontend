import { describe, expect, it } from "vitest";
import { groupBy } from "../../../src/common/util/group-by";

describe("groupBy", () => {
  it("groups items by the selected key in insertion order", () => {
    const result = groupBy(
      [
        { name: "a", type: "x" },
        { name: "b", type: "y" },
        { name: "c", type: "x" },
      ],
      (item) => item.type
    );

    expect(Object.keys(result)).toEqual(["x", "y"]);
    expect(result.x.map((item) => item.name)).toEqual(["a", "c"]);
    expect(result.y.map((item) => item.name)).toEqual(["b"]);
  });

  it("returns an empty object for an empty list", () => {
    expect(groupBy([], (item) => String(item))).toEqual({});
  });

  it.each(["constructor", "toString", "hasOwnProperty", "__proto__"])(
    "groups items under the key %s",
    (key) => {
      const result = groupBy(["first", "second"], () => key);

      expect(Object.keys(result)).toEqual([key]);
      expect(result[key]).toEqual(["first", "second"]);
      expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    }
  );
});
