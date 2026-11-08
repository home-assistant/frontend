import { describe, expect, it } from "vitest";

// #55748: a custom card can register its own "ha-action-bar", so importing
// ha-paste-bar (which extends it) must not blow up on the duplicate name.
describe("ha-paste-bar registration", () => {
  it("loads when a custom card already registered ha-action-bar", async () => {
    customElements.define("ha-action-bar", class extends HTMLElement {});

    await expect(
      import("../../src/components/ha-paste-bar")
    ).resolves.toBeDefined();

    expect(customElements.get("ha-paste-bar")).toBeDefined();
  });
});
