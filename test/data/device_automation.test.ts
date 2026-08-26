import { describe, expect, it } from "vitest";
import type { DeviceTrigger } from "../../src/data/device/device_automation";
import { findEquivalentDeviceAutomation } from "../../src/data/device/device_automation";
import type { EntityRegistryEntry } from "../../src/data/entity/entity_registry";

const entityRegistry = [
  { id: "regid1", entity_id: "binary_sensor.one" },
  { id: "regid2", entity_id: "binary_sensor.two" },
] as EntityRegistryEntry[];

const trigger = (partial: Partial<DeviceTrigger>): DeviceTrigger =>
  ({
    trigger: "device",
    domain: "binary_sensor",
    device_id: "device1",
    ...partial,
  }) as DeviceTrigger;

describe("findEquivalentDeviceAutomation", () => {
  it("picks the automation on the same entity among several of the same type", () => {
    const automations = [
      trigger({ device_id: "device2", type: "turned_on", entity_id: "regid1" }),
      trigger({ device_id: "device2", type: "turned_on", entity_id: "regid2" }),
    ];

    expect(
      findEquivalentDeviceAutomation(
        entityRegistry,
        automations,
        trigger({ type: "turned_on", entity_id: "regid2" })
      )
    ).toBe(automations[1]);
  });

  it("matches an entity referenced by entity id against one referenced by registry id", () => {
    const automations = [
      trigger({ device_id: "device2", type: "turned_on", entity_id: "regid1" }),
      trigger({ device_id: "device2", type: "turned_on", entity_id: "regid2" }),
    ];

    expect(
      findEquivalentDeviceAutomation(
        entityRegistry,
        automations,
        trigger({ type: "turned_on", entity_id: "binary_sensor.two" })
      )
    ).toBe(automations[1]);
  });

  it("falls back to the first automation of the same type when the entity is elsewhere", () => {
    const automations = [
      trigger({ device_id: "device2", type: "turned_on", entity_id: "regid1" }),
      trigger({
        device_id: "device2",
        type: "turned_off",
        entity_id: "regid1",
      }),
    ];

    expect(
      findEquivalentDeviceAutomation(
        entityRegistry,
        automations,
        trigger({ type: "turned_on", entity_id: "regid2" })
      )
    ).toBe(automations[0]);
  });

  it("matches entity-less automations on their subtype", () => {
    const automations = [
      trigger({
        device_id: "device2",
        domain: "zha",
        type: "remote_button_short_press",
        subtype: "button_1",
      }),
      trigger({
        device_id: "device2",
        domain: "zha",
        type: "remote_button_short_press",
        subtype: "button_2",
      }),
    ];

    expect(
      findEquivalentDeviceAutomation(
        entityRegistry,
        automations,
        trigger({
          domain: "zha",
          type: "remote_button_short_press",
          subtype: "button_2",
        })
      )
    ).toBe(automations[1]);
  });

  it("returns undefined when the device offers no automation of that type", () => {
    const automations = [
      trigger({
        device_id: "device2",
        type: "turned_off",
        entity_id: "regid1",
      }),
    ];

    expect(
      findEquivalentDeviceAutomation(
        entityRegistry,
        automations,
        trigger({ type: "turned_on", entity_id: "regid1" })
      )
    ).toBeUndefined();
  });
});
