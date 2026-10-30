import { describe, expect, it } from "vitest";
import { addRecent } from "../../../src/common/array/add-recent";

describe("addRecent", () => {
  it("works", () => {
    expect(addRecent(undefined, "a", 3)).toEqual(["a"]);
    expect(addRecent(["a", "b", "c"], "b", 3)).toEqual(["b", "a", "c"]);
    expect(addRecent(["a", "b", "c", "d"], "b", 3)).toEqual(["b", "a", "c"]);
    expect(addRecent(["a", "b", "c"], "d", 3)).toEqual(["d", "a", "b"]);
    expect(addRecent(["a", "x", "b"], "d", 3, (item) => item !== "x")).toEqual([
      "d",
      "a",
      "b",
    ]);
    expect(addRecent("broken" as unknown as string[], "a", 3)).toEqual(["a"]);
  });
});
