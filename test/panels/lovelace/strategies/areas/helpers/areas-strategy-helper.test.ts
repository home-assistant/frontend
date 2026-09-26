import { describe, expect, it } from "vitest";
import { getAreaGroupedEntities } from "../../../../../../src/panels/lovelace/strategies/areas/helpers/areas-strategy-helper";
import {
  mockArea,
  mockEntity,
} from "../../../../../common/entity/context/context-mock";
import {
  createMockEntityState,
  createMockHass,
} from "../../../../../fixtures/hass";

describe("getAreaGroupedEntities", () => {
  it("groups a non-badge sensor into the sensors group", () => {
    const hass = createMockHass(
      {
        "sensor.living_room_co2": createMockEntityState(
          "sensor.living_room_co2",
          "612",
          { device_class: "carbon_dioxide" }
        ),
      },
      {
        areas: { living_room: mockArea({ area_id: "living_room" }) },
        entities: {
          "sensor.living_room_co2": mockEntity({
            entity_id: "sensor.living_room_co2",
            area_id: "living_room",
          }),
        },
      }
    );

    const grouped = getAreaGroupedEntities("living_room", hass);

    expect(grouped.sensors).toEqual(["sensor.living_room_co2"]);
  });

  it("excludes the area's temperature and humidity badge entities from the sensors group", () => {
    const hass = createMockHass(
      {
        "sensor.living_room_temperature": createMockEntityState(
          "sensor.living_room_temperature",
          "21.5",
          { device_class: "temperature" }
        ),
        "sensor.living_room_humidity": createMockEntityState(
          "sensor.living_room_humidity",
          "45",
          { device_class: "humidity" }
        ),
        "sensor.living_room_co2": createMockEntityState(
          "sensor.living_room_co2",
          "612",
          { device_class: "carbon_dioxide" }
        ),
      },
      {
        areas: {
          living_room: mockArea({
            area_id: "living_room",
            temperature_entity_id: "sensor.living_room_temperature",
            humidity_entity_id: "sensor.living_room_humidity",
          }),
        },
        entities: {
          "sensor.living_room_temperature": mockEntity({
            entity_id: "sensor.living_room_temperature",
            area_id: "living_room",
          }),
          "sensor.living_room_humidity": mockEntity({
            entity_id: "sensor.living_room_humidity",
            area_id: "living_room",
          }),
          "sensor.living_room_co2": mockEntity({
            entity_id: "sensor.living_room_co2",
            area_id: "living_room",
          }),
        },
      }
    );

    const grouped = getAreaGroupedEntities("living_room", hass);

    // The temperature/humidity entities are already rendered as badges by
    // area-view-strategy.ts, so they must not also appear in the sensors
    // group, which would show the same reading twice.
    expect(grouped.sensors).toEqual(["sensor.living_room_co2"]);
  });
});
