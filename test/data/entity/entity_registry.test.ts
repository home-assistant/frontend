import { describe, expect, it } from "vitest";
import type { EntityRegistryDisplayEntry } from "../../../src/data/entity/entity_registry";
import { preserveUnchangedEntityRegistryDisplay } from "../../../src/data/entity/entity_registry";

const entry = (
  entity_id: string,
  overrides: Partial<EntityRegistryDisplayEntry> = {}
): EntityRegistryDisplayEntry => ({
  entity_id,
  labels: [],
  ...overrides,
});

const record = (
  ...entries: EntityRegistryDisplayEntry[]
): Record<string, EntityRegistryDisplayEntry> =>
  Object.fromEntries(entries.map((e) => [e.entity_id, e]));

describe("preserveUnchangedEntityRegistryDisplay", () => {
  it("returns next as-is when there is no previous record", () => {
    const next = record(entry("light.kitchen"));
    expect(preserveUnchangedEntityRegistryDisplay(undefined, next)).toBe(next);
  });

  it("returns the previous record when nothing changed", () => {
    const previous = record(entry("light.kitchen"), entry("light.living"));
    const next = record(entry("light.kitchen"), entry("light.living"));
    // Different record object and different entry objects, but equal content.
    expect(preserveUnchangedEntityRegistryDisplay(previous, next)).toBe(
      previous
    );
  });

  it("reuses unchanged entry objects and only swaps the changed one", () => {
    const previous = record(
      entry("light.kitchen", { name: "Kitchen" }),
      entry("light.living", { name: "Living" })
    );
    const next = record(
      entry("light.kitchen", { name: "Kitchen" }),
      entry("light.living", { name: "Living room" })
    );
    const result = preserveUnchangedEntityRegistryDisplay(previous, next);
    // A change happened, so the new record is returned.
    expect(result).toBe(next);
    // Unchanged entity keeps its previous object identity.
    expect(result["light.kitchen"]).toBe(previous["light.kitchen"]);
    // Changed entity uses the new object.
    expect(result["light.living"]).toBe(next["light.living"]);
    expect(result["light.living"].name).toBe("Living room");
  });

  it("treats a label content change as changed", () => {
    const previous = record(entry("light.kitchen", { labels: ["a", "b"] }));
    const next = record(entry("light.kitchen", { labels: ["a", "c"] }));
    const result = preserveUnchangedEntityRegistryDisplay(previous, next);
    expect(result).toBe(next);
    expect(result["light.kitchen"]).toBe(next["light.kitchen"]);
  });

  it("preserves an entry when labels are a new array with equal content", () => {
    const previous = record(entry("light.kitchen", { labels: ["a", "b"] }));
    const next = record(entry("light.kitchen", { labels: ["a", "b"] }));
    expect(preserveUnchangedEntityRegistryDisplay(previous, next)).toBe(
      previous
    );
  });

  it("ignores immutable source-defined fields", () => {
    // platform, translation_key, has_entity_name and entity_category can't
    // change for an existing entity, so a difference there is treated as equal.
    const previous = record(
      entry("light.kitchen", {
        platform: "hue",
        translation_key: "old",
        has_entity_name: false,
        entity_category: "config",
      })
    );
    const next = record(
      entry("light.kitchen", {
        platform: "deconz",
        translation_key: "new",
        has_entity_name: true,
        entity_category: "diagnostic",
      })
    );
    expect(preserveUnchangedEntityRegistryDisplay(previous, next)).toBe(
      previous
    );
  });

  it("returns next when an entity is added", () => {
    const previous = record(entry("light.kitchen"));
    const next = record(entry("light.kitchen"), entry("light.living"));
    const result = preserveUnchangedEntityRegistryDisplay(previous, next);
    expect(result).toBe(next);
    expect(result["light.kitchen"]).toBe(previous["light.kitchen"]);
  });

  it("returns next when an entity is removed", () => {
    const previous = record(entry("light.kitchen"), entry("light.living"));
    const next = record(entry("light.kitchen"));
    expect(preserveUnchangedEntityRegistryDisplay(previous, next)).toBe(next);
  });
});
