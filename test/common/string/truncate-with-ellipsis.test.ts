import { assert, describe, it } from "vitest";
import { truncateWithEllipsis } from "../../../src/common/string/truncate-with-ellipsis";

describe("truncateWithEllipsis", () => {
  it("works", () => {
    assert.strictEqual(truncateWithEllipsis("", 5), "");
    assert.strictEqual(truncateWithEllipsis("hello", 5), "hello");
    assert.strictEqual(truncateWithEllipsis("12345678", 5), "12345678");
    assert.strictEqual(truncateWithEllipsis("123456789", 5), "12345...");
    assert.strictEqual(truncateWithEllipsis("123456789", 3, "…"), "123…");
  });
});
