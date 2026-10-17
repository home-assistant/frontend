import { describe, expect, it } from "vitest";
import { addRecent } from "../../../src/common/array/add-recent";

describe("addRecent", () => {
  it("works", () => {
    expect(addRecent(undefined, "a", 3)).toEqual(["a"]);
    // A known value keeps its position
    expect(addRecent(["a", "b", "c"], "b", 3)).toEqual(["a", "b", "c"]);
    // The cap also applies when a known value is used again
    expect(addRecent(["a", "b", "c", "d"], "b", 3)).toEqual(["a", "b", "c"]);
    // A new value goes first and pushes the oldest out
    expect(addRecent(["a", "b", "c"], "d", 3)).toEqual(["d", "a", "b"]);
    // Invalid entries are dropped before the cap applies
    expect(addRecent(["a", "x", "b"], "d", 3, (item) => item !== "x")).toEqual([
      "d",
      "a",
      "b",
    ]);
    // Malformed stored data counts as empty
    expect(addRecent("broken" as unknown as string[], "a", 3)).toEqual(["a"]);
  });
});
