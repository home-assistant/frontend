import { describe, expect, it } from "vitest";

import { getConfigRelatedContext } from "../../../../src/panels/lovelace/common/get-config-related-context";

describe("getConfigRelatedContext", () => {
  it("returns an area context for area cards", () => {
    expect(getConfigRelatedContext({ type: "area", area: "kitchen" })).toEqual({
      itemType: "area",
      itemId: "kitchen",
    });
  });

  it("returns an entity context for entity cards", () => {
    expect(
      getConfigRelatedContext({ type: "entity", entity: "light.kitchen" })
    ).toEqual({
      itemType: "entity",
      itemId: "light.kitchen",
    });
  });

  it("prefers the area context for area cards with entity-like fields", () => {
    expect(
      getConfigRelatedContext({
        type: "area",
        area: "kitchen",
        entity: "light.kitchen",
      })
    ).toEqual({
      itemType: "area",
      itemId: "kitchen",
    });
  });

  it("returns undefined when no related context can be derived", () => {
    expect(getConfigRelatedContext({ type: "markdown" })).toBeUndefined();
  });
});
