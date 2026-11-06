import { mdiChartLine } from "@mdi/js";
import { describe, expect, it } from "vitest";
import "../../../src/components/target-picker/ha-target-picker-item-row";
import type { HaTargetPickerItemRow } from "../../../src/components/target-picker/ha-target-picker-item-row";
import type { AreaRegistryEntry } from "../../../src/data/area/area_registry";
import type { DeviceRegistryEntry } from "../../../src/data/device/device_registry";
import type { EntityRegistryDisplayEntry } from "../../../src/data/entity/entity_registry";
import { StatisticMeanType } from "../../../src/data/recorder";
import type {
  ExtractFromTargetResult,
  TargetType,
} from "../../../src/data/target";

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
  const row = el as any;
  row._registries = {
    areas: {},
    devices: {},
    entities: {},
    floors: {},
    ...registries,
  };
  row._states = {};
  row._api = { callWS: async () => result };

  await row._updateItemData();
  return row._entries as ExtractFromTargetResult | undefined;
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

  it("keeps a parent device without entities when a child device matches", async () => {
    const entries = await extractedBy(
      extractResult({
        referenced_devices: ["strip", "outlet_1"],
        referenced_entities: ["sensor.outlet_1_power"],
      }),
      {
        entities: {
          "sensor.outlet_1_power": mkEntity("sensor.outlet_1_power", {
            device_id: "outlet_1",
          }),
        },
        devices: {
          strip: mkDevice("strip", { area_id: "area_1" }),
          outlet_1: mkDevice("outlet_1", { parent_device_id: "strip" }),
        },
      }
    );

    expect(entries).toBeDefined();
    expect(entries!.referenced_devices).toEqual(["strip", "outlet_1"]);
    expect(entries!.referenced_entities).toEqual(["sensor.outlet_1_power"]);
  });

  it("does not mutate the extracted target result", async () => {
    const result = extractResult({
      referenced_areas: ["area_missing"],
      referenced_devices: ["dev_missing"],
      referenced_entities: ["light.missing"],
    });

    const entries = await extractedBy(
      result,
      {
        areas: {},
        devices: {},
        entities: {},
      },
      { type: "floor", itemId: "floor_1" }
    );

    expect(entries).toBeDefined();
    expect(entries).not.toBe(result);
    expect(entries!.referenced_areas).toEqual([]);
    expect(entries!.referenced_devices).toEqual([]);
    expect(entries!.referenced_entities).toEqual([]);
    expect(result.referenced_areas).toEqual(["area_missing"]);
    expect(result.referenced_devices).toEqual(["dev_missing"]);
    expect(result.referenced_entities).toEqual(["light.missing"]);
  });
});

describe("ha-target-picker-item-row external statistics", () => {
  const statisticId = "example:outdoor_temperature";

  // Resolves an entity row against the statistics metadata in `metadata`.
  const entityRow = async (itemId: string, metadata: unknown[]) => {
    const el = document.createElement(
      "ha-target-picker-item-row"
    ) as HaTargetPickerItemRow;
    el.type = "entity";
    el.itemId = itemId;
    const row = el as any;
    row._registries = {
      areas: {},
      devices: {},
      entities: {},
      floors: {},
    };
    row._states = {};
    row._i18n = {
      localize: (key: string) =>
        key === "component.example.title" ? "Example" : "",
    };
    const messages: Record<string, unknown>[] = [];
    row._api = {
      callWS: async (message: Record<string, unknown>) => {
        messages.push(message);
        return metadata;
      },
    };

    await row._updateItemData();
    return { data: row._itemData("entity", itemId), messages };
  };

  it("shows an external statistic by the name in its metadata", async () => {
    const { data, messages } = await entityRow(statisticId, [
      {
        statistic_id: statisticId,
        source: "example",
        name: "Outdoor temperature",
        statistics_unit_of_measurement: "°C",
        has_sum: false,
        mean_type: StatisticMeanType.ARITHMETIC,
        unit_class: "temperature",
      },
    ]);

    expect(messages).toEqual([
      {
        type: "recorder/get_statistics_metadata",
        statistic_ids: [statisticId],
      },
    ]);
    expect(data.name).toBe("Outdoor temperature");
    expect(data.context).toBe("Example");
    expect(data.fallbackIconPath).toBe(mdiChartLine);
    expect(data.notFound).toBe(false);
  });

  it("shows an external statistic without metadata as not found", async () => {
    const { data } = await entityRow(statisticId, []);

    expect(data.name).toBe(statisticId);
    expect(data.notFound).toBe(true);
  });

  it("does not look up statistics for an entity ID", async () => {
    const { data, messages } = await entityRow("sensor.missing", []);

    expect(messages).toEqual([]);
    expect(data.notFound).toBe(true);
  });
});
