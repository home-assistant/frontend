import { describe, expect, it } from "vitest";
import { computeLocalize } from "../../../src/common/translations/localize";

const localizeWith = (strings: Record<string, string>) =>
  computeLocalize<string>(document.createElement("div"), "en", {
    en: strings,
  });

describe("computeLocalize", () => {
  it("fills product names without the caller passing them", async () => {
    const localize = await localizeWith({
      key: "Nothing in the {marketplace} yet",
    });
    expect(localize("key")).toBe("Nothing in the Marketplace yet");
  });

  it("keeps the names next to the caller's values", async () => {
    const localize = await localizeWith({
      key: "{name} came from the {marketplace}",
    });
    expect(localize("key", { name: "Card" })).toBe(
      "Card came from the Marketplace"
    );
  });
});
