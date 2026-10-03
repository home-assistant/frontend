import Fuse from "fuse.js";
import { describe, expect, it } from "vitest";
import {
  multiTermSortedSearch,
  type FuseWeightedKey,
} from "../../src/resources/fuseMultiTerm";

interface Item {
  id: string;
  name: string;
  description: string;
}

const keys: FuseWeightedKey[] = [
  { name: "name", weight: 10 },
  { name: "description", weight: 1 },
];

const getId = (i: Item) => i.id;

const search = (items: Item[], query: string) => {
  const index = Fuse.createIndex(keys, items);
  return multiTermSortedSearch(items, query, getId, index);
};

const ids = (items: Item[], query: string) => search(items, query).map(getId);

const item = (id: string, name: string, description = ""): Item => ({
  id,
  name,
  description,
});

describe("multiTermSortedSearch", () => {
  describe("filtering", () => {
    it("returns all items for a blank search", () => {
      const items = [item("1", "Alpha"), item("2", "Beta")];

      expect(search(items, "   ")).toEqual(items);
    });

    it("returns an empty array when there are no items", () => {
      expect(search([], "alpha")).toEqual([]);
    });

    it("filters to matching items for a single term", () => {
      const items = [item("match", "Apple pie"), item("miss", "Banana bread")];

      expect(ids(items, "apple")).toEqual(["match"]);
    });

    it("keeps only items that match every term", () => {
      const items = [item("both", "Red apple"), item("one", "Red onion")];

      expect(ids(items, "red apple")).toEqual(["both"]);
    });

    it("returns nothing when a term matches no item", () => {
      const items = [item("1", "Red apple"), item("2", "Green apple")];

      expect(search(items, "apple zzzzz")).toEqual([]);
    });

    it("matches case-insensitively", () => {
      const items = [item("1", "Red Apple")];

      expect(ids(items, "RED apple")).toEqual(["1"]);
    });

    it("ignores diacritics", () => {
      const items = [item("1", "Crème brûlée")];

      expect(ids(items, "creme brulee")).toEqual(["1"]);
    });

    it("ignores extra whitespace between terms", () => {
      const items = [item("both", "Red apple"), item("one", "Red onion")];

      expect(ids(items, "red    apple")).toEqual(["both"]);
    });

    it("tolerates a small typo", () => {
      const items = [item("1", "Strawberry"), item("2", "Blueberry")];

      expect(ids(items, "strawbery")).toEqual(["1"]);
    });
  });

  describe("ranking", () => {
    it("ranks a match in a higher-weighted field first", () => {
      const inName = item("name", "ripe mango from the orchard");
      const inDescription = item("description", "Smoothie", "ripe mango");

      expect(ids([inDescription, inName], "ripe mango")[0]).toBe("name");
    });

    it("ranks the shorter match first when weights are equal", () => {
      const short = item("short", "ripe mango");
      const long = item("long", "ripe mango from the orchard");

      expect(ids([long, short], "ripe mango")[0]).toBe("short");
    });

    it("ranks an exact match above a fuzzy one", () => {
      const exact = item("exact", "Red apple");
      const fuzzy = item("fuzzy", "Red aple");

      expect(ids([fuzzy, exact], "red apple")[0]).toBe("exact");
    });
  });

  describe("parameters", () => {
    it("uses getItemId to aggregate an item across terms", () => {
      const items = [item("both", "Red apple"), item("one", "Red onion")];

      const result = multiTermSortedSearch(
        items,
        "red apple",
        getId,
        Fuse.createIndex(keys, items)
      );

      expect(result.map((i) => i.id)).toEqual(["both"]);
    });

    it("builds the index from keys passed in options when none is provided", () => {
      const items = [item("1", "Red apple"), item("2", "Green apple")];

      const result = multiTermSortedSearch(
        items,
        "red apple",
        getId,
        undefined,
        { keys }
      );

      expect(result.map((i) => i.id)).toEqual(["1"]);
    });

    it("returns nothing without an index or keys", () => {
      const items = [item("1", "Red apple")];

      expect(multiTermSortedSearch(items, "red apple", getId)).toEqual([]);
    });

    it("forwards Fuse options, like a stricter threshold", () => {
      const items = [item("1", "Strawberry")];
      const index = Fuse.createIndex(keys, items);

      // The default threshold accepts this typo; a threshold of 0 rejects it.
      expect(
        multiTermSortedSearch(items, "strawbery", getId, index, {
          threshold: 0,
        })
      ).toEqual([]);
    });
  });
});
