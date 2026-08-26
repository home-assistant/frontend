import { assert, describe, it } from "vitest";
import { devicesInEffectiveArea } from "../../src/data/device/device_registry";
import type { DeviceRegistryEntry } from "../../src/data/device/device_registry";

const device = (
  partial: Partial<DeviceRegistryEntry> & { id: string }
): DeviceRegistryEntry =>
  ({
    area_id: null,
    parent_device_id: null,
    ...partial,
  }) as DeviceRegistryEntry;

describe("devicesInEffectiveArea", () => {
  it("includes devices with the area set", () => {
    const devices = {
      a: device({ id: "a", area_id: "kitchen" }),
      b: device({ id: "b", area_id: "bedroom" }),
    };
    assert.deepEqual(
      devicesInEffectiveArea(devices, "kitchen").map((d) => d.id),
      ["a"]
    );
  });

  it("includes a child device inheriting its parent's area", () => {
    const devices = {
      parent: device({ id: "parent", area_id: "kitchen" }),
      child: device({ id: "child", parent_device_id: "parent" }),
    };
    assert.deepEqual(
      devicesInEffectiveArea(devices, "kitchen")
        .map((d) => d.id)
        .sort(),
      ["child", "parent"]
    );
  });

  it("excludes a child device with a different explicit area", () => {
    const devices = {
      parent: device({ id: "parent", area_id: "kitchen" }),
      child: device({
        id: "child",
        area_id: "bedroom",
        parent_device_id: "parent",
      }),
    };
    assert.deepEqual(
      devicesInEffectiveArea(devices, "kitchen").map((d) => d.id),
      ["parent"]
    );
    // ...and the child belongs to its own area instead.
    assert.deepEqual(
      devicesInEffectiveArea(devices, "bedroom").map((d) => d.id),
      ["child"]
    );
  });

  it("excludes a child whose parent has no area", () => {
    const devices = {
      parent: device({ id: "parent" }),
      child: device({ id: "child", parent_device_id: "parent" }),
    };
    assert.deepEqual(devicesInEffectiveArea(devices, "kitchen"), []);
  });
});
