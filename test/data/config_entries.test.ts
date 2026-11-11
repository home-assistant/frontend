import { describe, expect, it } from "vitest";
import type { ConfigEntry } from "../../src/data/config_entries";
import { ConfigEntryStream } from "../../src/data/config_entries";

const entry = (entryId: string, title = entryId) =>
  ({ entry_id: entryId, title }) as ConfigEntry;

describe("ConfigEntryStream", () => {
  it("returns a new array for every change", () => {
    const stream = new ConfigEntryStream();
    const initial = stream.processMessage([
      { type: null, entry: entry("a") },
      { type: null, entry: entry("b") },
    ]);
    expect(initial.map((e) => e.entry_id)).toEqual(["a", "b"]);

    const added = stream.processMessage([{ type: "added", entry: entry("c") }]);
    expect(added).not.toBe(initial);
    expect(initial.map((e) => e.entry_id)).toEqual(["a", "b"]);
    expect(added.map((e) => e.entry_id)).toEqual(["a", "b", "c"]);

    const updated = stream.processMessage([
      { type: "updated", entry: entry("b", "B") },
    ]);
    expect(updated).not.toBe(added);
    expect(updated.map((e) => e.title)).toEqual(["a", "B", "c"]);

    const removed = stream.processMessage([
      { type: "removed", entry: entry("a") },
    ]);
    expect(removed).not.toBe(updated);
    expect(removed.map((e) => e.entry_id)).toEqual(["b", "c"]);
  });

  it("replaces the list when a new snapshot arrives", () => {
    const stream = new ConfigEntryStream();
    stream.processMessage([
      { type: null, entry: entry("a") },
      { type: null, entry: entry("b") },
    ]);
    const resubscribed = stream.processMessage([
      { type: null, entry: entry("b") },
      { type: null, entry: entry("c") },
    ]);
    expect(resubscribed.map((e) => e.entry_id)).toEqual(["b", "c"]);
  });
});
