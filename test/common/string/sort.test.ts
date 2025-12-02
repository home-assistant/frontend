import { assert, describe, it } from "vitest";

import { stringCompare } from "../../../src/common/string/compare";

describe("stringCompare", () => {
  // Node only ships with English support for `Intl`, so we cannot test for other language collators.
  it("Ensure natural order reutrned when numeric value is included", () => {
    assert.strictEqual(stringCompare("Helper 2", "Helper 10"), -1);
  });

  it("Ensure prefixed numeric value is sorted naturally", () => {
    assert.strictEqual(stringCompare("2 Helper", "10 Helper"), -1);
  });

  it("Ensure order has reversed alphabet is sorted", () => {
    const reverseAlphabet = [
      "z",
      "y",
      "x",
      "w",
      "v",
      "u",
      "t",
      "d",
      "c",
      "b",
      "a",
    ];
    assert.deepStrictEqual(
      [...reverseAlphabet].sort(stringCompare),
      [...reverseAlphabet].reverse()
    );
  });

  it("Ensure natural order when using numbers", () => {
    const testArray = [
      "Helper 1",
      "Helper 10",
      "Helper 2",
      "Helper 3",
      "Helper 4",
    ];
    assert.deepStrictEqual([...testArray].sort(stringCompare), [
      "Helper 1",
      "Helper 2",
      "Helper 3",
      "Helper 4",
      "Helper 10",
    ]);
  });
});
