import { describe, expect, it } from "vitest";
import {
  DEFAULT_SUMMARY_KEYS,
  resolveShortcutItems,
  type ShortcutItem,
} from "../../src/data/home_shortcuts";

describe("resolveShortcutItems", () => {
  it("returns DEFAULT_SUMMARY_KEYS when nothing is saved", () => {
    expect(resolveShortcutItems(undefined)).toEqual(
      DEFAULT_SUMMARY_KEYS.map((key) => ({ type: "summary", key }))
    );
    expect(resolveShortcutItems([])).toEqual(
      DEFAULT_SUMMARY_KEYS.map((key) => ({ type: "summary", key }))
    );
  });

  it("appends unseen summaries after the saved list", () => {
    const saved: ShortcutItem[] = [
      { type: "custom", path: "/garden" },
      { type: "summary", key: "climate" },
    ];
    const resolved = resolveShortcutItems(saved);
    expect(resolved[0]).toEqual({ type: "custom", path: "/garden" });
    expect(resolved[1]).toEqual({ type: "summary", key: "climate" });
    const tailKeys = resolved
      .slice(2)
      .filter(
        (i): i is { type: "summary"; key: string } => i.type === "summary"
      )
      .map((i) => i.key);
    expect(tailKeys).toEqual(
      DEFAULT_SUMMARY_KEYS.filter((k) => k !== "climate")
    );
  });

  it("preserves hidden flags on saved summaries", () => {
    const saved: ShortcutItem[] = [
      { type: "summary", key: "light", hidden: true },
    ];
    const resolved = resolveShortcutItems(saved);
    expect(resolved[0]).toEqual({
      type: "summary",
      key: "light",
      hidden: true,
    });
  });

  it("ignores duplicate summary entries in saved data", () => {
    const saved: ShortcutItem[] = [
      { type: "summary", key: "light" },
      { type: "summary", key: "light", hidden: true },
    ];
    const resolved = resolveShortcutItems(saved);
    const lightEntries = resolved.filter(
      (i) => i.type === "summary" && i.key === "light"
    );
    expect(lightEntries).toHaveLength(1);
    expect(lightEntries[0]).toEqual({ type: "summary", key: "light" });
  });

  it("does not append a summary already explicitly placed", () => {
    const saved: ShortcutItem[] = DEFAULT_SUMMARY_KEYS.map((key) => ({
      type: "summary" as const,
      key,
    }));
    const resolved = resolveShortcutItems(saved);
    expect(resolved).toHaveLength(DEFAULT_SUMMARY_KEYS.length);
    expect(resolved).toEqual(saved);
  });

  it("drops summary entries whose key is no longer a default", () => {
    const saved: ShortcutItem[] = [
      { type: "summary", key: "removed_summary" },
      { type: "custom", path: "/garden" },
    ];
    const resolved = resolveShortcutItems(saved);
    expect(
      resolved.some((i) => i.type === "summary" && i.key === "removed_summary")
    ).toBe(false);
    expect(resolved[0]).toEqual({ type: "custom", path: "/garden" });
  });
});
