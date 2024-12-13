import { assert, describe, it } from "vitest";
import { documentationUrl } from "../../src/util/documentation-url";

describe("Generate documentation URL", () => {
  it("Generate documentation url for stable", () => {
    assert.strictEqual(
      // @ts-ignore
      documentationUrl({ config: { version: "1.0.0" } }, "/blog"),
      "https://www.home-assistant.io/blog"
    );
  });
  it("Generate documentation url for rc", () => {
    assert.strictEqual(
      // @ts-ignore
      documentationUrl({ config: { version: "1.0.0b0" } }, "/blog"),
      "https://rc.home-assistant.io/blog"
    );
  });
});
