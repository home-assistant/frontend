import { describe, expect, it } from "vitest";
import { define } from "../src/utils/define";

// Home Assistant and custom cards can each ship a copy of the library, so a
// second registration of the same tag must be ignored instead of throwing.
describe("define", () => {
  it("registers an element that is not registered yet", () => {
    class First extends HTMLElement {}
    define("hac-test-first", First);
    expect(customElements.get("hac-test-first")).toBe(First);
  });

  it("keeps the first registration of a tag name", () => {
    class Original extends HTMLElement {}
    class Duplicate extends HTMLElement {}
    define("hac-test-duplicate", Original);
    expect(() => define("hac-test-duplicate", Duplicate)).not.toThrow();
    expect(customElements.get("hac-test-duplicate")).toBe(Original);
  });
});
