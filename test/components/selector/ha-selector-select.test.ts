import { describe, expect, it } from "vitest";
import { keepOptionOrder } from "../../../src/components/ha-selector/ha-selector-select";

// Protects the order an integration gives its options (nearest first, most
// used first): search results must keep it instead of the match score.
describe("keepOptionOrder", () => {
  const items = ["a", "b", "c", "d"].map((id) => ({ id, primary: id }));

  it("puts the matches back in the order of the options", () => {
    const matches = [items[3], items[0], items[2]];

    expect(keepOptionOrder("x", matches, items).map((item) => item.id)).toEqual(
      ["a", "c", "d"]
    );
  });

  it("leaves the matches it was given unchanged", () => {
    const matches = [items[1], items[0]];

    keepOptionOrder("x", matches, items);

    expect(matches.map((item) => item.id)).toEqual(["b", "a"]);
  });
});
