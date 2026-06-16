import { describe, expect, it } from "vitest";
import { getEntities } from "../../../src/data/entity/entity_picker";
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
