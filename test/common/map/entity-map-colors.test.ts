import type { Connection } from "home-assistant-js-websocket";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  entityMapColor,
  HOME_ZONE_ENTITY_ID,
  subscribeEntityMapColors,
  zoneColor,
} from "../../../src/common/map/entity-map-colors";

// The registry stream is driven by hand so creation order can be played out
const registry = vi.hoisted(() => ({
  callback: undefined as ((entries: unknown[]) => void) | undefined,
  unsubscribe: vi.fn(),
}));
vi.mock("../../../src/data/entity/entity_registry", () => ({
  subscribeEntityRegistry: vi.fn((_conn, onChange) => {
    registry.callback = onChange;
    return registry.unsubscribe;
  }),
}));

// Palette slot N reads back as "color-N", so an index is visible in the result
const styles = {
  getPropertyValue: (name: string) => name.replace("--", ""),
} as unknown as CSSStyleDeclaration;

// One connection, as in the app; a different one would take the stream over
const connection = {} as Connection;

const entry = (entityId: string, createdAt: number, id = entityId) => ({
  entity_id: entityId,
  created_at: createdAt,
  id,
});

describe("entity map colors", () => {
  let unsubscribe: () => void;

  beforeEach(() => {
    registry.callback = undefined;
    registry.unsubscribe.mockClear();
    unsubscribe = subscribeEntityMapColors(connection, () => undefined);
  });

  afterEach(() => {
    unsubscribe();
  });

  it("colors entities in creation order, per domain", () => {
    registry.callback!([
      entry("zone.work", 30),
      entry("zone.school", 10),
      entry("person.anne", 20),
      entry("zone.gym", 20),
    ]);

    expect(entityMapColor("zone.school", styles)).toBe("color-1");
    expect(entityMapColor("zone.gym", styles)).toBe("color-2");
    expect(entityMapColor("zone.work", styles)).toBe("color-3");
    // Persons start their own sequence
    expect(entityMapColor("person.anne", styles)).toBe("color-1");
  });

  it("breaks creation ties by registry id", () => {
    registry.callback!([
      entry("zone.b", 10, "id-b"),
      entry("zone.a", 10, "id-a"),
    ]);

    expect(entityMapColor("zone.a", styles)).toBe("color-1");
    expect(entityMapColor("zone.b", styles)).toBe("color-2");
  });

  it("keeps the home zone out of the palette", () => {
    registry.callback!([entry(HOME_ZONE_ENTITY_ID, 1), entry("zone.work", 2)]);

    expect(entityMapColor("zone.work", styles)).toBe("color-1");
    expect(zoneColor(HOME_ZONE_ENTITY_ID, false, styles)).toBe("primary-color");
  });

  it("mutes passive zones", () => {
    registry.callback!([entry("zone.quiet", 1)]);

    expect(zoneColor("zone.quiet", true, styles)).toBe("secondary-text-color");
    expect(zoneColor("zone.quiet", false, styles)).toBe("color-1");
  });

  it("gives entities outside the registry a stable color", () => {
    registry.callback!([]);

    const color = entityMapColor("zone.yaml_zone", styles);
    expect(color).toMatch(/^color-\d+$/);
    expect(entityMapColor("zone.yaml_zone", styles)).toBe(color);
    expect(entityMapColor("zone.other_yaml_zone", styles)).not.toBe(color);
  });

  it("shares one registry stream and releases it with the last subscriber", () => {
    const notified = vi.fn();
    const second = subscribeEntityMapColors(connection, notified);
    registry.callback!([entry("zone.work", 1)]);
    expect(notified).toHaveBeenCalledOnce();

    second();
    expect(registry.unsubscribe).not.toHaveBeenCalled();
    unsubscribe();
    expect(registry.unsubscribe).toHaveBeenCalledOnce();
    // Subscribe again in afterEach's stead so its unsubscribe stays balanced
    unsubscribe = subscribeEntityMapColors(connection, () => undefined);
  });
});
