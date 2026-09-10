import { describe, expect, it } from "vitest";
import type { EntityRegistryEntry } from "../../../src/data/entity/entity_registry";
import {
  entityMapColor,
  HOME_ZONE_ENTITY_ID,
  zoneColor,
} from "../../../src/common/map/entity-map-colors";

// Palette slot N reads back as "color-N", so an index is visible in the result
const styles = {
  getPropertyValue: (name: string) => name.replace("--", ""),
} as unknown as CSSStyleDeclaration;

const entry = (entityId: string, createdAt: number, id = entityId) =>
  ({
    entity_id: entityId,
    created_at: createdAt,
    id,
  }) as EntityRegistryEntry;

describe("entity map colors", () => {
  it("colors entities in creation order, per domain", () => {
    const entries = [
      entry("zone.work", 30),
      entry("zone.school", 10),
      entry("person.anne", 20),
      entry("zone.gym", 20),
    ];

    expect(entityMapColor("zone.school", entries, styles)).toBe("color-1");
    expect(entityMapColor("zone.gym", entries, styles)).toBe("color-2");
    expect(entityMapColor("zone.work", entries, styles)).toBe("color-3");
    // Persons start their own sequence
    expect(entityMapColor("person.anne", entries, styles)).toBe("color-1");
  });

  it("breaks creation ties by registry id", () => {
    const entries = [entry("zone.b", 10, "b"), entry("zone.a", 10, "a")];

    expect(entityMapColor("zone.a", entries, styles)).toBe("color-1");
    expect(entityMapColor("zone.b", entries, styles)).toBe("color-2");
  });

  it("keeps the home zone out of the palette", () => {
    const entries = [entry(HOME_ZONE_ENTITY_ID, 10), entry("zone.work", 20)];

    expect(entityMapColor("zone.work", entries, styles)).toBe("color-1");
    expect(zoneColor(HOME_ZONE_ENTITY_ID, false, entries, styles)).toBe(
      "primary-color"
    );
  });

  it("mutes passive zones", () => {
    const entries = [entry("zone.quiet", 10)];

    expect(zoneColor("zone.quiet", true, entries, styles)).toBe(
      "secondary-text-color"
    );
    expect(zoneColor("zone.quiet", false, entries, styles)).toBe("color-1");
  });

  it("gives entities outside the registry a stable color", () => {
    const entries = [entry("zone.work", 10)];

    const color = entityMapColor("zone.yaml_zone", entries, styles);
    expect(entityMapColor("zone.yaml_zone", entries, styles)).toBe(color);
    expect(entityMapColor("zone.other_yaml_zone", entries, styles)).not.toBe(
      color
    );
  });
});
