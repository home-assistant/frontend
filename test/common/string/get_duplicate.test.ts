import { expect, test } from "vitest";
import { getDuplicates } from "../../../src/common/string/get_duplicates";

test("getDuplicate", () => {
  expect(getDuplicates([])).toStrictEqual(new Set());
  expect(getDuplicates(["light", "vacuum", "switch"])).toStrictEqual(new Set());
  expect(getDuplicates(["light", "light", "vacuum", "switch"])).toStrictEqual(
    new Set(["light"])
  );
  expect(
    getDuplicates(["vacuum", "light", "light", "vacuum", "switch"])
  ).toStrictEqual(new Set(["light", "vacuum"]));
  expect(getDuplicates(["light", "light", "light"])).toStrictEqual(
    new Set(["light"])
  );
});
