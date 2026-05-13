import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import {
  buildEntityTree,
  filterEntityTree,
  areaKey,
  deviceKey,
  domainKey,
  floorKey,
  OTHER_AREAS_ID,
  unassignedKey,
} from "../../../../../src/panels/lovelace/editor/card-editor/entity-tree-builder";
import type { HomeAssistant } from "../../../../../src/types";

const state = (
  entityId: string,
  attributes: Record<string, unknown> = {}
): HassEntity => ({
  entity_id: entityId,
  state: "on",
  attributes: { friendly_name: entityId, ...attributes },
  last_changed: "",
  last_updated: "",
  context: { id: "", parent_id: null, user_id: null },
});

const entity = (overrides: Record<string, unknown>) =>
  ({
    name: null,
    icon: null,
    platform: "test",
    translation_key: null,
    device_id: null,
    area_id: null,
    hidden: false,
    entity_category: null,
    has_entity_name: false,
    options: null,
    labels: [],
    categories: {},
    display_precision: null,
    ...overrides,
  }) as any;

const device = (id: string, overrides: Record<string, unknown> = {}) =>
  ({
    id,
    name: id,
    name_by_user: null,
    area_id: null,
    entry_type: null,
    primary_config_entry: null,
    config_entries: [],
    config_entries_subentries: {},
    connections: [],
    identifiers: [],
    manufacturer: null,
    model: null,
    model_id: null,
    labels: [],
    sw_version: null,
    hw_version: null,
    serial_number: null,
    via_device_id: null,
    disabled_by: null,
    configuration_url: null,
    ...overrides,
  }) as any;

const area = (id: string, overrides: Record<string, unknown> = {}) =>
  ({
    area_id: id,
    name: id,
    icon: null,
    floor_id: null,
    aliases: [],
    labels: [],
    picture: null,
    temperature_entity_id: null,
    humidity_entity_id: null,
    created_at: 0,
    modified_at: 0,
    ...overrides,
  }) as any;

const floor = (id: string, overrides: Record<string, unknown> = {}) =>
  ({
    floor_id: id,
    name: id,
    icon: null,
    level: 0,
    aliases: [],
    ...overrides,
  }) as any;

const makeHass = (overrides: Partial<HomeAssistant>): HomeAssistant =>
  ({
    states: {},
    entities: {},
    devices: {},
    areas: {},
    floors: {},
    locale: { language: "en" } as any,
    localize: (key: string) => key,
    ...overrides,
  }) as unknown as HomeAssistant;

describe("buildEntityTree", () => {
  it("groups entities by floor → area", () => {
    const hass = makeHass({
      states: {
        "light.living": state("light.living"),
        "light.kitchen": state("light.kitchen"),
      },
      entities: {
        "light.living": entity({ area_id: "living" }),
        "light.kitchen": entity({ area_id: "kitchen" }),
      },
      areas: {
        living: area("living", { floor_id: "ground" }),
        kitchen: area("kitchen", { floor_id: "ground" }),
      },
      floors: { ground: floor("ground") },
    });

    const tree = buildEntityTree(hass);
    expect(tree.floors).toHaveLength(1);
    expect(tree.floors[0].id).toBe("ground");
    const areas = tree.floors[0].areas;
    expect(areas.map((a) => a.id).sort()).toEqual(["kitchen", "living"]);
  });

  it("puts areas without a floor in otherAreas", () => {
    const hass = makeHass({
      states: { "light.a": state("light.a") },
      entities: { "light.a": entity({ area_id: "orphan" }) },
      areas: { orphan: area("orphan") },
    });

    const tree = buildEntityTree(hass);
    expect(tree.floors).toHaveLength(0);
    expect(tree.otherAreas.map((a) => a.id)).toEqual(["orphan"]);
  });

  it("nests device entities under their device when the entry has no area override", () => {
    const hass = makeHass({
      states: {
        "sensor.temp": state("sensor.temp"),
        "binary_sensor.motion": state("binary_sensor.motion"),
      },
      entities: {
        "sensor.temp": entity({ device_id: "dev1" }),
        "binary_sensor.motion": entity({ device_id: "dev1" }),
      },
      devices: { dev1: device("dev1", { area_id: "living" }) },
      areas: { living: area("living") },
    });

    const tree = buildEntityTree(hass);
    const livingArea = tree.otherAreas[0];
    expect(livingArea.devices).toHaveLength(1);
    expect(livingArea.devices[0].entityIds.sort()).toEqual([
      "binary_sensor.motion",
      "sensor.temp",
    ]);
  });

  it("treats entities with their own area_id as direct area entities (not under device)", () => {
    const hass = makeHass({
      states: { "sensor.temp": state("sensor.temp") },
      entities: {
        "sensor.temp": entity({ device_id: "dev1", area_id: "living" }),
      },
      devices: { dev1: device("dev1", { area_id: "kitchen" }) },
      areas: { living: area("living"), kitchen: area("kitchen") },
    });

    const tree = buildEntityTree(hass);
    const living = tree.otherAreas.find((a) => a.id === "living")!;
    expect(living.directEntityIds).toEqual(["sensor.temp"]);
    expect(living.devices).toEqual([]);
  });

  it("buckets unassigned entities by device/helper/domain", () => {
    const hass = makeHass({
      states: {
        "light.unowned": state("light.unowned"),
        "input_boolean.helper": state("input_boolean.helper"),
        "sensor.from_device": state("sensor.from_device"),
        "sensor.service_one": state("sensor.service_one"),
      },
      entities: {
        "light.unowned": entity({}),
        "input_boolean.helper": entity({}),
        "sensor.from_device": entity({ device_id: "dev_orphan" }),
        "sensor.service_one": entity({ device_id: "dev_service" }),
      },
      devices: {
        dev_orphan: device("dev_orphan"),
        dev_service: device("dev_service", { entry_type: "service" }),
      },
    });

    const tree = buildEntityTree(hass);
    const ids = tree.unassignedSections.map((s) => s.id);
    expect(ids).toContain("entities");
    expect(ids).toContain("helpers");
    expect(ids).toContain("devices");
    expect(ids).toContain("services");
  });

  it("excludes hidden and unavailable entities", () => {
    const hass = makeHass({
      states: {
        "light.visible": state("light.visible"),
        "light.hidden": state("light.hidden"),
        "light.unavailable": {
          ...state("light.unavailable"),
          state: "unavailable",
        },
      },
      entities: {
        "light.visible": entity({ area_id: "living" }),
        "light.hidden": entity({ area_id: "living", hidden: true }),
        "light.unavailable": entity({ area_id: "living" }),
      },
      areas: { living: area("living") },
    });

    const tree = buildEntityTree(hass);
    const entities = tree.otherAreas[0].directEntityIds;
    expect(entities).toEqual(["light.visible"]);
  });

  it("indexes searchable entities for fuse", () => {
    const hass = makeHass({
      states: { "light.kitchen": state("light.kitchen") },
      entities: { "light.kitchen": entity({ area_id: "kitchen" }) },
      areas: { kitchen: area("kitchen", { name: "Kitchen" }) },
    });

    const tree = buildEntityTree(hass);
    expect(tree.searchableEntities).toHaveLength(1);
    expect(tree.searchableEntities[0]).toMatchObject({
      id: "light.kitchen",
      area: "Kitchen",
    });
  });
});

describe("filterEntityTree", () => {
  const buildSample = () => {
    const hass = makeHass({
      states: {
        "light.kitchen_ceiling": state("light.kitchen_ceiling"),
        "light.living_lamp": state("light.living_lamp"),
        "sensor.orphan": state("sensor.orphan"),
      },
      entities: {
        "light.kitchen_ceiling": entity({ area_id: "kitchen" }),
        "light.living_lamp": entity({ area_id: "living" }),
        "sensor.orphan": entity({}),
      },
      areas: {
        kitchen: area("kitchen", { floor_id: "ground" }),
        living: area("living", { floor_id: "ground" }),
      },
      floors: { ground: floor("ground") },
    });
    return buildEntityTree(hass);
  };

  it("returns the input tree unchanged when filter is empty", () => {
    const tree = buildSample();
    const { tree: out, autoExpand } = filterEntityTree(tree, "");
    expect(out).toBe(tree);
    expect(autoExpand.size).toBe(0);
  });

  it("auto-expands the ancestors of every match", () => {
    const tree = buildSample();
    const { tree: out, autoExpand } = filterEntityTree(tree, "kitchen");

    expect(out.floors).toHaveLength(1);
    expect(out.floors[0].areas.map((a) => a.id)).toEqual(["kitchen"]);

    const groundKey = floorKey("ground");
    const kitchenKey = areaKey(groundKey, "kitchen");
    expect(autoExpand.has(groundKey)).toBe(true);
    expect(autoExpand.has(kitchenKey)).toBe(true);
  });

  it("drops branches with no matches", () => {
    const tree = buildSample();
    const { tree: out } = filterEntityTree(tree, "orphan");

    expect(out.floors).toHaveLength(0);
    expect(out.otherAreas).toHaveLength(0);
    expect(out.unassignedSections.map((s) => s.id)).toContain("entities");
  });
});

describe("key helpers", () => {
  it("produces nested keys whose prefixes match their ancestor key", () => {
    const f = floorKey("ground");
    const a = areaKey(f, "kitchen");
    const d = deviceKey(a, "dev1");
    expect(a.startsWith(`${f}~`)).toBe(true);
    expect(d.startsWith(`${a}~`)).toBe(true);
  });

  it("separates unassigned and floor namespaces", () => {
    expect(floorKey(OTHER_AREAS_ID)).not.toBe(unassignedKey("entities"));
    expect(domainKey(unassignedKey("entities"), "light").startsWith("u|")).toBe(
      true
    );
  });
});
