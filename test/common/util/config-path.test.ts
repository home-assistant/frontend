import { describe, expect, it } from "vitest";
import {
  pathEquals,
  stringifyPath,
} from "../../../src/common/util/config-path";

describe("config path", () => {
  it("works", () => {
    expect(stringifyPath(["actions", 0, "then", 1])).toBe("actions/0/then/1");
    expect(stringifyPath([])).toBe("");

    expect(pathEquals(["actions", 0], ["actions", 0])).toBe(true);
    expect(pathEquals(["actions", 0], ["actions", 1])).toBe(false);
    // A number segment is not equal to the same digits as a string
    expect(pathEquals(["actions", 0], ["actions", "0"])).toBe(false);
    expect(pathEquals(["actions", 0], ["actions", 0, "then"])).toBe(false);
    expect(pathEquals([], [])).toBe(true);
  });
});
