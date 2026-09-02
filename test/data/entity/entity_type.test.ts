import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";

import type { HomeAssistant } from "../../../src/types";
import {
  entityTypeFilterFunc,
  entityTypesNeedStates,
  parseEntityType,
  usedEntityTypes,
} from "../../../src/data/entity/entity_type";

const state = (entityId: string, deviceClass?: string): HassEntity =>
  ({
    entity_id: entityId,
    attributes: deviceClass ? { device_class: deviceClass } : {},
  }) as unknown as HassEntity;

const makeStates = (...entities: HassEntity[]): HomeAssistant["states"] =>
  Object.fromEntries(entities.map((entity) => [entity.entity_id, entity]));

describe("parseEntityType", () => {
  it("reads a domain and a device class", () => {
    expect(parseEntityType("sensor")).toEqual({ domain: "sensor" });
    expect(parseEntityType("sensor/power")).toEqual({
      domain: "sensor",
      deviceClass: "power",
    });
  });
});

describe("entityTypesNeedStates", () => {
  it("only needs the states for a device class", () => {
    expect(entityTypesNeedStates(["light", "cover"])).toBe(false);
    expect(entityTypesNeedStates(["light", "sensor/power"])).toBe(true);
    expect(entityTypesNeedStates(undefined)).toBe(false);
  });
});

describe("usedEntityTypes", () => {
  it("splits a domain by device class, none included", () => {
    const types = usedEntityTypes(
      makeStates(
        state("binary_sensor.front_door", "door"),
        state("binary_sensor.hall_motion", "motion"),
        state("binary_sensor.unknown")
      )
    );

    expect(types.get("binary_sensor")?.sort()).toEqual([
      "door",
      "motion",
      "none",
    ]);
  });

  it("keeps a single-bucket domain whole", () => {
    const types = usedEntityTypes(
      makeStates(
        state("light.kitchen"),
        state("cover.garage", "garage"),
        state("cover.gate", "garage")
      )
    );

    expect(types.get("light")).toEqual([]);
    expect(types.get("cover")).toEqual([]);
  });

  it("ignores a device class on a domain that has none", () => {
    const types = usedEntityTypes(makeStates(state("light.kitchen", "bogus")));

    expect(types.get("light")).toEqual([]);
  });
});

describe("entityTypeFilterFunc", () => {
  const states = makeStates(
    state("binary_sensor.front_door", "door"),
    state("binary_sensor.hall_motion", "motion"),
    state("binary_sensor.unknown"),
    state("light.kitchen")
  );

  it("matches a whole domain", () => {
    const matches = entityTypeFilterFunc(["binary_sensor"], states);

    expect(matches("binary_sensor.front_door")).toBe(true);
    expect(matches("binary_sensor.unknown")).toBe(true);
    expect(matches("light.kitchen")).toBe(false);
  });

  it("matches a device class", () => {
    const matches = entityTypeFilterFunc(["binary_sensor/door"], states);

    expect(matches("binary_sensor.front_door")).toBe(true);
    expect(matches("binary_sensor.hall_motion")).toBe(false);
    expect(matches("binary_sensor.unknown")).toBe(false);
  });

  it("matches the entities that carry no device class", () => {
    const matches = entityTypeFilterFunc(["binary_sensor/none"], states);

    expect(matches("binary_sensor.unknown")).toBe(true);
    expect(matches("binary_sensor.front_door")).toBe(false);
  });

  it("unions the selection", () => {
    const matches = entityTypeFilterFunc(
      ["light", "binary_sensor/door"],
      states
    );

    expect(matches("light.kitchen")).toBe(true);
    expect(matches("binary_sensor.front_door")).toBe(true);
    expect(matches("binary_sensor.hall_motion")).toBe(false);
  });

  it("keeps an entity without a state only for its domain", () => {
    const matches = entityTypeFilterFunc(["binary_sensor"], states);
    const narrowed = entityTypeFilterFunc(["binary_sensor/none"], states);

    expect(matches("binary_sensor.disabled")).toBe(true);
    expect(narrowed("binary_sensor.disabled")).toBe(false);
  });
});
