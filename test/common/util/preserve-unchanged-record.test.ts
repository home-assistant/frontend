import { describe, expect, it } from "vitest";
import { deepEqual } from "../../../src/common/util/deep-equal";
import { preserveUnchangedRecord } from "../../../src/common/util/preserve-unchanged-record";

interface Item {
  id: string;
  name: string;
  labels?: string[];
}

const record = (...items: Item[]): Record<string, Item> =>
  Object.fromEntries(items.map((i) => [i.id, i]));

describe("preserveUnchangedRecord", () => {
  it("returns next as-is when there is no previous record", () => {
    const next = record({ id: "a", name: "A" });
    expect(preserveUnchangedRecord(undefined, next, deepEqual)).toBe(next);
  });

  it("returns the previous record when nothing changed", () => {
    const previous = record({ id: "a", name: "A" }, { id: "b", name: "B" });
    const next = record({ id: "a", name: "A" }, { id: "b", name: "B" });
    expect(preserveUnchangedRecord(previous, next, deepEqual)).toBe(previous);
  });

  it("reuses unchanged item objects and only swaps the changed one", () => {
    const previous = record({ id: "a", name: "A" }, { id: "b", name: "B" });
    const next = record({ id: "a", name: "A" }, { id: "b", name: "B2" });
    const result = preserveUnchangedRecord(previous, next, deepEqual);
    expect(result).toBe(next);
    expect(result.a).toBe(previous.a);
    expect(result.b).toBe(next.b);
  });

  it("deep-compares nested values", () => {
    const previous = record({ id: "a", name: "A", labels: ["x", "y"] });
    const next = record({ id: "a", name: "A", labels: ["x", "y"] });
    // New nested array, equal content -> treated as unchanged.
    expect(preserveUnchangedRecord(previous, next, deepEqual)).toBe(previous);

    const changedNext = record({ id: "a", name: "A", labels: ["x", "z"] });
    const result = preserveUnchangedRecord(previous, changedNext, deepEqual);
    expect(result).toBe(changedNext);
    expect(result.a).toBe(changedNext.a);
  });

  it("returns next when an item is added", () => {
    const previous = record({ id: "a", name: "A" });
    const next = record({ id: "a", name: "A" }, { id: "b", name: "B" });
    const result = preserveUnchangedRecord(previous, next, deepEqual);
    expect(result).toBe(next);
    expect(result.a).toBe(previous.a);
  });

  it("returns next when an item is removed", () => {
    const previous = record({ id: "a", name: "A" }, { id: "b", name: "B" });
    const next = record({ id: "a", name: "A" });
    expect(preserveUnchangedRecord(previous, next, deepEqual)).toBe(next);
  });
});
