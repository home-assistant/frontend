import { describe, expect, it } from "vitest";
import type { RelatedIdSets } from "../../../src/common/search/related-context";
import {
  getEntities,
  markEntitiesRelated,
  sortEntitiesByRelatedRank,
  type EntityComboBoxItem,
} from "../../../src/data/entity/entity_picker";
import type { HomeAssistant } from "../../../src/types";

const makeHass = (entityIds: string[]): HomeAssistant => {
  const states: Record<string, any> = {};
  for (const id of entityIds) {
    states[id] = {
      entity_id: id,
      state: "on",
      attributes: { friendly_name: id },
      last_changed: "",
      last_updated: "",
      context: { id: "", parent_id: null, user_id: null },
    };
  }
  return {
    states,
    entities: {},
    devices: {},
    areas: {},
    floors: {},
    language: "en",
    localize: ((key: string) => key) as any,
    translationMetadata: { translations: {} },
  } as unknown as HomeAssistant;
};

const ids = (items: { id: string }[]) => items.map((item) => item.id).sort();

describe("getEntities", () => {
  const hass = makeHass([
    "light.kitchen",
    "light.living",
    "switch.fan",
    "sensor.temp",
  ]);

  it("returns all entities when no filters are given", () => {
    expect(ids(getEntities(hass))).toEqual([
      "light.kitchen",
      "light.living",
      "sensor.temp",
      "switch.fan",
    ]);
  });

  it("filters by includeDomains", () => {
    expect(ids(getEntities(hass, { includeDomains: ["light"] }))).toEqual([
      "light.kitchen",
      "light.living",
    ]);
  });

  it("filters by excludeDomains", () => {
    expect(
      ids(getEntities(hass, { excludeDomains: ["light", "switch"] }))
    ).toEqual(["sensor.temp"]);
  });

  it("filters by includeEntities", () => {
    expect(
      ids(
        getEntities(hass, {
          includeEntities: ["light.kitchen", "sensor.temp"],
        })
      )
    ).toEqual(["light.kitchen", "sensor.temp"]);
  });

  it("filters by excludeEntities", () => {
    expect(
      ids(
        getEntities(hass, {
          excludeEntities: ["light.kitchen", "light.living"],
        })
      )
    ).toEqual(["sensor.temp", "switch.fan"]);
  });

  it("combines include and exclude filters", () => {
    expect(
      ids(
        getEntities(hass, {
          includeDomains: ["light"],
          excludeEntities: ["light.living"],
        })
      )
    ).toEqual(["light.kitchen"]);
  });

  it("applies idPrefix to the item id", () => {
    const items = getEntities(hass, {
      includeEntities: ["sensor.temp"],
      idPrefix: "entity-",
    });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("entity-sensor.temp");
  });
});

const item = (entityId: string): EntityComboBoxItem => ({
  id: entityId,
  primary: entityId,
  sorting_label: entityId,
  stateObj: { entity_id: entityId } as any,
});

const emptyRelated = (): RelatedIdSets => ({
  areas: new Set(),
  devices: new Set(),
  entities: new Set(),
});

// entity.in_area sits on device "dev" in area "area";
// entity.in_device sits on device "dev"; entity.lonely has no device or area.
const relatedHass = {
  entities: {
    "light.in_area": { entity_id: "light.in_area", device_id: "dev" },
    "light.in_device": { entity_id: "light.in_device", device_id: "dev2" },
    "light.lonely": { entity_id: "light.lonely" },
  },
  devices: {
    dev: { id: "dev", area_id: "area" },
    dev2: { id: "dev2" },
  },
} as unknown as HomeAssistant;

describe("markEntitiesRelated", () => {
  it("ranks the entity itself closest", () => {
    const related = emptyRelated();
    related.entities.add("light.lonely");
    const [marked] = markEntitiesRelated(
      [item("light.lonely")],
      related,
      relatedHass.entities,
      relatedHass.devices
    );
    expect(marked.relatedRank).toBe(0);
  });

  it("ranks an entity by its device when not directly related", () => {
    const related = emptyRelated();
    related.devices.add("dev2");
    const [marked] = markEntitiesRelated(
      [item("light.in_device")],
      related,
      relatedHass.entities,
      relatedHass.devices
    );
    expect(marked.relatedRank).toBe(1);
  });

  it("ranks an entity by its (device-inherited) area", () => {
    const related = emptyRelated();
    related.areas.add("area");
    const [marked] = markEntitiesRelated(
      [item("light.in_area")],
      related,
      relatedHass.entities,
      relatedHass.devices
    );
    expect(marked.relatedRank).toBe(2);
  });

  it("marks unrelated entities with the lowest rank", () => {
    const related = emptyRelated();
    related.entities.add("light.other");
    const [marked] = markEntitiesRelated(
      [item("light.lonely")],
      related,
      relatedHass.entities,
      relatedHass.devices
    );
    expect(marked.relatedRank).toBe(3);
  });
});

describe("sortEntitiesByRelatedRank", () => {
  it("sorts by closeness: entity, then device, then area, then the rest", () => {
    const related = emptyRelated();
    related.entities.add("light.in_device"); // direct entity match wins
    related.devices.add("dev"); // covers light.in_area via its device
    related.areas.add("area");
    const marked = markEntitiesRelated(
      [item("light.lonely"), item("light.in_area"), item("light.in_device")],
      related,
      relatedHass.entities,
      relatedHass.devices
    );
    const sorted = sortEntitiesByRelatedRank(marked, "en");
    expect(sorted.map((i) => i.id)).toEqual([
      "light.in_device", // rank 0 (entity)
      "light.in_area", // rank 1 (device)
      "light.lonely", // rank 3 (unrelated)
    ]);
  });

  it("breaks ties alphabetically by label when a language is given", () => {
    const sorted = sortEntitiesByRelatedRank(
      [item("light.zebra"), item("light.apple")],
      "en"
    );
    expect(sorted.map((i) => i.id)).toEqual(["light.apple", "light.zebra"]);
  });

  it("keeps incoming order within a tier when no language is given", () => {
    const sorted = sortEntitiesByRelatedRank([
      item("light.zebra"),
      item("light.apple"),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["light.zebra", "light.apple"]);
  });

  it("falls back to plain alphabetical when nothing is related", () => {
    const marked = markEntitiesRelated(
      [item("light.zebra"), item("light.apple")],
      emptyRelated(),
      relatedHass.entities,
      relatedHass.devices
    );
    const sorted = sortEntitiesByRelatedRank(marked, "en");
    expect(sorted.map((i) => i.id)).toEqual(["light.apple", "light.zebra"]);
  });
});
