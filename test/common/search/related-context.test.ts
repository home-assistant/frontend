import { describe, expect, it } from "vitest";
import { buildRelatedIdSets } from "../../../src/common/search/related-context";
import type { RelatedIdSets } from "../../../src/common/search/related-context";
import type { RelatedResult } from "../../../src/data/search";

const toArrays = (value: RelatedIdSets) => ({
  entities: [...value.entities].sort(),
  devices: [...value.devices].sort(),
  areas: [...value.areas].sort(),
});

describe("buildRelatedIdSets", () => {
  it("builds empty sets with no arguments", () => {
    expect(toArrays(buildRelatedIdSets())).toEqual({
      entities: [],
      devices: [],
      areas: [],
    });
  });

  it("builds sets from a related result", () => {
    const related: RelatedResult = {
      entity: ["light.kitchen"],
      device: ["dev1"],
      area: ["area1"],
    };
    expect(toArrays(buildRelatedIdSets(related))).toEqual({
      entities: ["light.kitchen"],
      devices: ["dev1"],
      areas: ["area1"],
    });
  });

  it("merges a current entity into the entities group", () => {
    const related: RelatedResult = { device: ["dev1"], area: ["area1"] };
    const result = buildRelatedIdSets(related, {
      itemType: "entity",
      itemId: "light.ac",
    });
    expect(toArrays(result)).toEqual({
      entities: ["light.ac"],
      devices: ["dev1"],
      areas: ["area1"],
    });
  });

  it("merges a current device into the devices group", () => {
    const result = buildRelatedIdSets(undefined, {
      itemType: "device",
      itemId: "dev1",
    });
    expect([...result.devices]).toEqual(["dev1"]);
  });

  it("merges a current area into the areas group", () => {
    const result = buildRelatedIdSets(undefined, {
      itemType: "area",
      itemId: "area1",
    });
    expect([...result.areas]).toEqual(["area1"]);
  });

  it("ignores a current item whose type is not tracked", () => {
    const result = buildRelatedIdSets(undefined, {
      itemType: "automation",
      itemId: "auto1",
    });
    expect(toArrays(result)).toEqual({ entities: [], devices: [], areas: [] });
  });

  it("deduplicates a current item already in the related result", () => {
    const related: RelatedResult = { entity: ["light.ac"] };
    const result = buildRelatedIdSets(related, {
      itemType: "entity",
      itemId: "light.ac",
    });
    expect([...result.entities]).toEqual(["light.ac"]);
  });
});
