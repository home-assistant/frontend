import { describe, expect, it } from "vitest";
import type { EntityRegistryEntry } from "../../../src/data/entity/entity_registry";
import {
  entityMapColor,
  HOME_ZONE_ENTITY_ID,
  nextZoneColor,
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

describe("entityMapColor", () => {
  it("colors zones by creation date, whatever the trackers", () => {
    const entries = [
      entry("zone.work", 30),
      entry("device_tracker.beacon", 5),
      entry("zone.school", 10),
      entry("person.anne", 20),
    ];

    expect(entityMapColor("zone.school", entries, styles)).toBe("color-1");
    expect(entityMapColor("zone.work", entries, styles)).toBe("color-2");
  });

  it("colors persons before trackers, then by creation date", () => {
    const entries = [
      entry("device_tracker.phone", 30),
      entry("device_tracker.beacon", 5),
      entry("person.anne", 20),
      entry("zone.work", 1),
    ];

    expect(entityMapColor("person.anne", entries, styles)).toBe("color-1");
    expect(entityMapColor("device_tracker.beacon", entries, styles)).toBe(
      "color-2"
    );
    expect(entityMapColor("device_tracker.phone", entries, styles)).toBe(
      "color-3"
    );
  });

  it("breaks creation ties by registry id", () => {
    const entries = [entry("zone.b", 10, "b"), entry("zone.a", 10, "a")];

    expect(entityMapColor("zone.a", entries, styles)).toBe("color-1");
    expect(entityMapColor("zone.b", entries, styles)).toBe("color-2");
  });

  it("keeps the home zone out of the palette", () => {
    const entries = [entry(HOME_ZONE_ENTITY_ID, 10), entry("zone.work", 20)];

    expect(entityMapColor("zone.work", entries, styles)).toBe("color-1");
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

describe("zoneColor", () => {
  it("uses the primary color for the home zone", () => {
    const entries = [entry(HOME_ZONE_ENTITY_ID, 10)];

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
});

describe("nextZoneColor", () => {
  it("takes the slot after the last zone", () => {
    const entries = [
      entry(HOME_ZONE_ENTITY_ID, 10),
      entry("zone.work", 20),
      entry("person.anne", 30),
      entry("device_tracker.phone", 40),
    ];

    expect(nextZoneColor(false, entries, styles)).toBe("color-2");
  });

  it("mutes a new passive zone", () => {
    expect(nextZoneColor(true, [entry("zone.work", 10)], styles)).toBe(
      "secondary-text-color"
    );
  });
});
