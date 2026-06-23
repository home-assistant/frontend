import { describe, expect, it } from "vitest";
import {
  buildRelatedIdSets,
  sortRelatedFirst,
} from "../../../src/common/search/related-context";
import type { RelatedIdSets } from "../../../src/common/search/related-context";
import type { PickerComboBoxItem } from "../../../src/components/ha-picker-combo-box";
import type { RelatedResult } from "../../../src/data/search";

const toArrays = (value: RelatedIdSets) => ({
  entities: [...value.entities].sort(),
  devices: [...value.devices].sort(),
  areas: [...value.areas].sort(),
});

const item = (id: string, isRelated?: boolean): PickerComboBoxItem => ({
  id,
  primary: id,
  ...(isRelated === undefined ? {} : { isRelated }),
});

const orderOf = (items: PickerComboBoxItem[]) => items.map((i) => i.id);

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

describe("sortRelatedFirst", () => {
  it("floats related items above unrelated ones", () => {
    const items = [
      item("a", false),
      item("b", true),
      item("c", false),
      item("d", true),
    ];
    expect(orderOf(sortRelatedFirst(items))).toEqual(["b", "d", "a", "c"]);
  });

  it("preserves relative order within each group (stable)", () => {
    const items = [
      item("r1", true),
      item("u1", false),
      item("r2", true),
      item("u2", false),
      item("r3", true),
    ];
    expect(orderOf(sortRelatedFirst(items))).toEqual([
      "r1",
      "r2",
      "r3",
      "u1",
      "u2",
    ]);
  });

  it("treats a missing isRelated flag as unrelated", () => {
    const items = [item("plain"), item("related", true)];
    expect(orderOf(sortRelatedFirst(items))).toEqual(["related", "plain"]);
  });

  it("keeps order when nothing is related", () => {
    const items = [item("a"), item("b"), item("c")];
    expect(orderOf(sortRelatedFirst(items))).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the input array", () => {
    const items = [item("a", false), item("b", true)];
    sortRelatedFirst(items);
    expect(orderOf(items)).toEqual(["a", "b"]);
  });
});
