import { describe, expect, it } from "vitest";
import { filterLowBatteryEntities } from "../../../../src/panels/maintenance/strategies/maintenance-view-strategy";
import { mockEntity } from "../../../common/entity/context/context-mock";
import { createMockEntityState, createMockHass } from "../../../fixtures/hass";

describe("filterLowBatteryEntities", () => {
  it("filters numeric battery entities by the low battery threshold", () => {
    const hass = createMockHass({
      "sensor.low_battery": createMockEntityState("sensor.low_battery", "20", {
        device_class: "battery",
      }),
      "sensor.ok_battery": createMockEntityState("sensor.ok_battery", "21", {
        device_class: "battery",
      }),
    });

    expect(
      filterLowBatteryEntities(hass, [
        "sensor.low_battery",
        "sensor.ok_battery",
      ])
    ).toEqual(["sensor.low_battery"]);
  });

  it("excludes a low battery when its device is charging", () => {
    const entities = {
      "sensor.device_1_battery": mockEntity({
        entity_id: "sensor.device_1_battery",
        device_id: "device_1",
      }),
      "binary_sensor.device_1_battery_charging": mockEntity({
        entity_id: "binary_sensor.device_1_battery_charging",
        device_id: "device_1",
      }),
      "sensor.device_2_battery": mockEntity({
        entity_id: "sensor.device_2_battery",
        device_id: "device_2",
      }),
      "binary_sensor.device_2_battery_charging": mockEntity({
        entity_id: "binary_sensor.device_2_battery_charging",
        device_id: "device_2",
      }),
    };

    const hass = createMockHass(
      {
        "sensor.device_1_battery": createMockEntityState(
          "sensor.device_1_battery",
          "10",
          { device_class: "battery" }
        ),
        "binary_sensor.device_1_battery_charging": createMockEntityState(
          "binary_sensor.device_1_battery_charging",
          "on",
          { device_class: "battery_charging" }
        ),
        "sensor.device_2_battery": createMockEntityState(
          "sensor.device_2_battery",
          "10",
          { device_class: "battery" }
        ),
        "binary_sensor.device_2_battery_charging": createMockEntityState(
          "binary_sensor.device_2_battery_charging",
          "off",
          { device_class: "battery_charging" }
        ),
      },
      { entities }
    );

    expect(
      filterLowBatteryEntities(hass, [
        "sensor.device_1_battery",
        "sensor.device_2_battery",
      ])
    ).toEqual(["sensor.device_2_battery"]);
  });

  it("keeps binary battery sensor behavior unchanged", () => {
    const hass = createMockHass({
      "binary_sensor.low_battery": createMockEntityState(
        "binary_sensor.low_battery",
        "on",
        { device_class: "battery" }
      ),
      "binary_sensor.ok_battery": createMockEntityState(
        "binary_sensor.ok_battery",
        "off",
        { device_class: "battery" }
      ),
    });

    expect(
      filterLowBatteryEntities(hass, [
        "binary_sensor.low_battery",
        "binary_sensor.ok_battery",
      ])
    ).toEqual(["binary_sensor.low_battery"]);
  });

  it("updates the device lookup when the entity registry changes", () => {
    const states = {
      "sensor.battery": createMockEntityState("sensor.battery", "10", {
        device_class: "battery",
      }),
      "binary_sensor.battery_charging": createMockEntityState(
        "binary_sensor.battery_charging",
        "on",
        { device_class: "battery_charging" }
      ),
    };

    const firstHass = createMockHass(states, {
      entities: {
        "sensor.battery": mockEntity({
          entity_id: "sensor.battery",
          device_id: "device_1",
        }),
        "binary_sensor.battery_charging": mockEntity({
          entity_id: "binary_sensor.battery_charging",
          device_id: "device_1",
        }),
      },
    });

    expect(filterLowBatteryEntities(firstHass, ["sensor.battery"])).toEqual([]);

    const secondHass = createMockHass(states, {
      entities: {
        "sensor.battery": mockEntity({
          entity_id: "sensor.battery",
          device_id: "device_1",
        }),
        "binary_sensor.battery_charging": mockEntity({
          entity_id: "binary_sensor.battery_charging",
          device_id: "device_2",
        }),
      },
    });

    expect(filterLowBatteryEntities(secondHass, ["sensor.battery"])).toEqual([
      "sensor.battery",
    ]);
  });
});
