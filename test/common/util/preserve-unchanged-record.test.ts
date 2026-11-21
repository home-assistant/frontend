import { describe, expect, it } from "vitest";
import { deepEqual } from "../../../src/common/util/deep-equal";
import {
  preserveUnchangedMap,
  preserveUnchangedRecord,
} from "../../../src/common/util/preserve-unchanged-record";

interface Item {
  id: string;
  name: string;
  labels?: string[];
}

const record = (...items: Item[]): Record<string, Item> =>
  Object.fromEntries(items.map((i) => [i.id, i]));

describe.each([false, true])(
  "preserveUnchangedRecord (compareOrder: %s)",
  (compareOrder) => {
    it("returns next as-is when there is no previous record", () => {
      const next = record({ id: "a", name: "A" });
      expect(
        preserveUnchangedRecord(undefined, next, deepEqual, compareOrder)
      ).toBe(next);
    });

    it("returns the previous record when nothing changed", () => {
      const previous = record({ id: "a", name: "A" }, { id: "b", name: "B" });
      const next = record({ id: "a", name: "A" }, { id: "b", name: "B" });
      expect(
        preserveUnchangedRecord(previous, next, deepEqual, compareOrder)
      ).toBe(previous);
    });

    it("reuses unchanged item objects and only swaps the changed one", () => {
      const previous = record({ id: "a", name: "A" }, { id: "b", name: "B" });
      const next = record({ id: "a", name: "A" }, { id: "b", name: "B2" });
      const result = preserveUnchangedRecord(
        previous,
        next,
        deepEqual,
        compareOrder
      );
      expect(result).toBe(next);
      expect(result.a).toBe(previous.a);
      expect(result.b).toBe(next.b);
    });

    it("deep-compares nested values", () => {
      const previous = record({ id: "a", name: "A", labels: ["x", "y"] });
      const next = record({ id: "a", name: "A", labels: ["x", "y"] });
      // New nested array, equal content -> treated as unchanged.
      expect(
        preserveUnchangedRecord(previous, next, deepEqual, compareOrder)
      ).toBe(previous);

      const changedNext = record({ id: "a", name: "A", labels: ["x", "z"] });
      const result = preserveUnchangedRecord(
        previous,
        changedNext,
        deepEqual,
        compareOrder
      );
      expect(result).toBe(changedNext);
      expect(result.a).toBe(changedNext.a);
    });

    it("returns next when an item is added", () => {
      const previous = record({ id: "a", name: "A" });
      const next = record({ id: "a", name: "A" }, { id: "b", name: "B" });
      const result = preserveUnchangedRecord(
        previous,
        next,
        deepEqual,
        compareOrder
      );
      expect(result).toBe(next);
      expect(result.a).toBe(previous.a);
    });

    it("returns next when an item is removed", () => {
      const previous = record({ id: "a", name: "A" }, { id: "b", name: "B" });
      const next = record({ id: "a", name: "A" });
      expect(
        preserveUnchangedRecord(previous, next, deepEqual, compareOrder)
      ).toBe(next);
    });

    it("appropriately compares if order has changed", () => {
      const previous = record({ id: "a", name: "A" }, { id: "b", name: "B" });
      const next = record({ id: "b", name: "B" }, { id: "a", name: "A" });
      const result = preserveUnchangedRecord(
        previous,
        next,
        deepEqual,
        compareOrder
      );
      expect(result).toBe(compareOrder ? next : previous);
      expect(result.a).toBe(previous.a);
      expect(result.b).toBe(previous.b);
    });
  }
);

describe("preserveUnchangedMap", () => {
  const map = (...items: Item[]): Map<string, Item> =>
    new Map(items.map((i) => [i.id, i]));

  it("returns next as-is when there is no previous map", () => {
    const next = map({ id: "a", name: "A" });
    expect(preserveUnchangedMap(undefined, next, deepEqual)).toBe(next);
  });

  it("returns the previous map when nothing changed", () => {
    const previous = map({ id: "a", name: "A" }, { id: "b", name: "B" });
    const next = map({ id: "a", name: "A" }, { id: "b", name: "B" });
    expect(preserveUnchangedMap(previous, next, deepEqual)).toBe(previous);
  });

  it("reuses unchanged items and keeps the order of next", () => {
    const previous = map({ id: "a", name: "A" }, { id: "b", name: "B" });
    const next = map({ id: "a", name: "A" }, { id: "b", name: "B2" });
    const result = preserveUnchangedMap(previous, next, deepEqual);
    expect(result).toBe(next);
    expect(result.get("a")).toBe(previous.get("a"));
    expect(result.get("b")).toBe(next.get("b"));
    expect([...result.keys()]).toEqual(["a", "b"]);
  });

  it("returns next when an item is added or removed", () => {
    const previous = map({ id: "a", name: "A" });
    const added = map({ id: "a", name: "A" }, { id: "b", name: "B" });
    expect(preserveUnchangedMap(previous, added, deepEqual)).toBe(added);
    const removed = map();
    expect(preserveUnchangedMap(previous, removed, deepEqual)).toBe(removed);
  });

  // Plain objects list integer-like keys first, so a record cannot see this
  // reorder. This is why floors are kept in a Map.
  it("detects a reorder of integer-like keys", () => {
    const previous = map({ id: "2", name: "Two" }, { id: "1", name: "One" });
    const next = map({ id: "1", name: "One" }, { id: "2", name: "Two" });
    const result = preserveUnchangedMap(previous, next, deepEqual);
    expect(result).toBe(next);
    expect([...result.keys()]).toEqual(["1", "2"]);
    expect(result.get("1")).toBe(previous.get("1"));
  });
});
