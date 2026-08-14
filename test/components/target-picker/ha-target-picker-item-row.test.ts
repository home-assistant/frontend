import { describe, expect, it } from "vitest";
import "../../../src/components/target-picker/ha-target-picker-item-row";
import type { HaTargetPickerItemRow } from "../../../src/components/target-picker/ha-target-picker-item-row";
import type { AreaRegistryEntry } from "../../../src/data/area/area_registry";
import type { DeviceRegistryEntry } from "../../../src/data/device/device_registry";
import type { EntityRegistryDisplayEntry } from "../../../src/data/entity/entity_registry";
import type {
  ExtractFromTargetResult,
  TargetType,
} from "../../../src/data/target";
import type { HomeAssistant } from "../../../src/types";

const extractResult = (
  referenced: Partial<ExtractFromTargetResult>
): ExtractFromTargetResult => ({
  missing_areas: [],
  missing_devices: [],
  missing_floors: [],
  missing_labels: [],
  referenced_areas: [],
  referenced_devices: [],
  referenced_entities: [],
  ...referenced,
});

const mkEntity = (
  entity_id: string,
  rest: Partial<EntityRegistryDisplayEntry> = {}
): EntityRegistryDisplayEntry => ({ entity_id, labels: [], ...rest });

const mkDevice = (
  id: string,
  rest: Partial<DeviceRegistryEntry> = {}
): DeviceRegistryEntry =>
  ({ id, area_id: null, labels: [], ...rest }) as DeviceRegistryEntry;

interface Registries {
  entities?: Record<string, EntityRegistryDisplayEntry>;
  devices?: Record<string, DeviceRegistryEntry>;
  areas?: Record<string, AreaRegistryEntry>;
}

// Runs the row's extraction against `result`, with only the registry entries in
// `registries` available to filter it.
const extractedBy = async (
  result: ExtractFromTargetResult,
  registries: Registries,
  {
    type = "area",
    itemId = "area_1",
  }: { type?: TargetType; itemId?: string } = {}
) => {
  const el = document.createElement(
    "ha-target-picker-item-row"
  ) as HaTargetPickerItemRow;
  el.type = type;
  el.itemId = itemId;
  el.hass = {
    areas: {},
    devices: {},
    entities: {},
    states: {},
    callWS: async () => result,
    ...registries,
  } as unknown as HomeAssistant;

  await (el as any)._updateItemData();
  return (el as any)._entries as ExtractFromTargetResult | undefined;
};

describe("ha-target-picker-item-row target extraction", () => {
  it("drops entities that are missing from the entity registry", async () => {
    // Disabled entities are referenced by core but never reach the display
    // registry, which is the crash in #52964.
    const entries = await extractedBy(
      extractResult({
        referenced_entities: ["light.known", "light.disabled"],
      }),
      {
        entities: {
          "light.known": mkEntity("light.known", { area_id: "area_1" }),
        },
      }
    );

    expect(entries).toBeDefined();
    expect(entries!.referenced_entities).toEqual(["light.known"]);
  });

  it("keeps every entity when all registry entries resolve", async () => {
    const entries = await extractedBy(
      extractResult({
        referenced_entities: ["light.one", "light.two"],
      }),
      {
        entities: {
          "light.one": mkEntity("light.one", { area_id: "area_1" }),
          "light.two": mkEntity("light.two", { area_id: "area_1" }),
        },
      }
    );

    expect(entries).toBeDefined();
    expect(entries!.referenced_entities).toEqual(["light.one", "light.two"]);
  });

  it("drops a device missing from the registry, and entities linked only through it", async () => {
    const entries = await extractedBy(
      extractResult({
        referenced_devices: ["dev_known", "dev_missing"],
        referenced_entities: ["light.on_known_dev", "light.on_missing_dev"],
      }),
      {
        devices: { dev_known: mkDevice("dev_known") },
        entities: {
          "light.on_known_dev": mkEntity("light.on_known_dev", {
            device_id: "dev_known",
          }),
          "light.on_missing_dev": mkEntity("light.on_missing_dev", {
            device_id: "dev_missing",
          }),
        },
      }
    );

    expect(entries).toBeDefined();
    expect(entries!.referenced_devices).toEqual(["dev_known"]);
    expect(entries!.referenced_entities).toEqual(["light.on_known_dev"]);
  });

  it("keeps an entity targeted through its own area when its device is missing", async () => {
    // A device we do not know about is not a filter decision, so it must not
    // take an entity that the area targets directly down with it.
    const entries = await extractedBy(
      extractResult({
        referenced_devices: ["dev_missing"],
        referenced_entities: ["light.explicit_area"],
      }),
      {
        entities: {
          "light.explicit_area": mkEntity("light.explicit_area", {
            area_id: "area_1",
            device_id: "dev_missing",
          }),
        },
      }
    );

    expect(entries).toBeDefined();
    expect(entries!.referenced_entities).toEqual(["light.explicit_area"]);
  });

  it("keeps devices of a floor whose area is missing from the registry", async () => {
    // Same rule for areas: an area we do not know about must not mark itself
    // hidden and drop the devices the floor references through it.
    const entries = await extractedBy(
      extractResult({
        referenced_areas: ["area_missing"],
        referenced_devices: ["dev_1"],
        referenced_entities: ["light.on_dev1"],
      }),
      {
        areas: {},
        devices: { dev_1: mkDevice("dev_1", { area_id: "area_missing" }) },
        entities: {
          "light.on_dev1": mkEntity("light.on_dev1", { device_id: "dev_1" }),
        },
      },
      { type: "floor", itemId: "floor_1" }
    );

    expect(entries).toBeDefined();
    expect(entries!.referenced_devices).toEqual(["dev_1"]);
    expect(entries!.referenced_entities).toEqual(["light.on_dev1"]);
  });
});
