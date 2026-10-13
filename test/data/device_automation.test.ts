import { describe, expect, it } from "vitest";
import type { DeviceTrigger } from "../../src/data/device/device_automation";
import {
  fetchReplacementDevices,
  findEquivalentDeviceAutomation,
} from "../../src/data/device/device_automation";
import type { DeviceCompositeSplits } from "../../src/data/device/device_registry";
import type { EntityRegistryEntry } from "../../src/data/entity/entity_registry";
import type { HomeAssistant } from "../../src/types";

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

  it("returns undefined when the same type is only offered for another entity", () => {
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
    ).toBeUndefined();
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

describe("fetchReplacementDevices", () => {
  const hass = {
    callWS: () => Promise.resolve([]),
    devices: { device2: {}, device3: {} },
  } as unknown as HomeAssistant;

  const compositeSplits = {
    removed: { split_ids: ["device2", "device3"], primary_id: "device2" },
  } as unknown as DeviceCompositeSplits;

  const value = trigger({
    device_id: "removed",
    type: "turned_on",
    entity_id: "regid1",
  });

  it("keeps only the devices that offer the automation", async () => {
    const offers = {
      device2: [
        trigger({
          device_id: "device2",
          type: "turned_on",
          entity_id: "regid1",
        }),
      ],
      device3: [
        trigger({
          device_id: "device3",
          type: "turned_on",
          entity_id: "regid2",
        }),
      ],
    };

    expect(
      await fetchReplacementDevices(
        hass,
        entityRegistry,
        value,
        compositeSplits,
        (_callWS, deviceId) => Promise.resolve(offers[deviceId])
      )
    ).toEqual(["device2"]);
  });

  it("drops a device whose automations cannot be listed", async () => {
    expect(
      await fetchReplacementDevices(
        hass,
        entityRegistry,
        value,
        compositeSplits,
        (_callWS, deviceId) =>
          deviceId === "device2"
            ? Promise.reject(new Error("unknown device"))
            : Promise.resolve([
                trigger({
                  device_id: "device3",
                  type: "turned_on",
                  entity_id: "regid1",
                }),
              ])
      )
    ).toEqual(["device3"]);
  });
});
