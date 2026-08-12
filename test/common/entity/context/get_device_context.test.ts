import { assert, describe, it } from "vitest";
import { getDeviceArea } from "../../../../src/common/entity/context/get_device_context";
import type { AreaRegistryEntry } from "../../../../src/data/area/area_registry";
import type { DeviceRegistryEntry } from "../../../../src/data/device/device_registry";
import type { HomeAssistant } from "../../../../src/types";

const area = (id: string): AreaRegistryEntry =>
  ({ area_id: id, name: id }) as AreaRegistryEntry;

const device = (
  partial: Partial<DeviceRegistryEntry> & { id: string }
): DeviceRegistryEntry =>
  ({
    area_id: null,
    parent_device_id: null,
    ...partial,
  }) as DeviceRegistryEntry;

const AREAS: HomeAssistant["areas"] = {
  kitchen: area("kitchen"),
  living_room: area("living_room"),
};

describe("getDeviceArea", () => {
  it("returns the device's own area", () => {
    const dev = device({ id: "d1", area_id: "kitchen" });
    assert.strictEqual(getDeviceArea(dev, AREAS)?.area_id, "kitchen");
  });

  it("returns undefined when the device has no area", () => {
    const dev = device({ id: "d1" });
    assert.strictEqual(getDeviceArea(dev, AREAS), undefined);
  });

  it("inherits the parent's area for a child without its own area", () => {
    const parent = device({ id: "parent", area_id: "living_room" });
    const child = device({ id: "child", parent_device_id: "parent" });
    const devices = { parent, child };
    assert.strictEqual(
      getDeviceArea(child, AREAS, devices)?.area_id,
      "living_room"
    );
  });

  it("prefers the child's own area over the parent's", () => {
    const parent = device({ id: "parent", area_id: "living_room" });
    const child = device({
      id: "child",
      area_id: "kitchen",
      parent_device_id: "parent",
    });
    const devices = { parent, child };
    assert.strictEqual(
      getDeviceArea(child, AREAS, devices)?.area_id,
      "kitchen"
    );
  });

  it("does not inherit when devices are not provided", () => {
    const child = device({ id: "child", parent_device_id: "parent" });
    assert.strictEqual(getDeviceArea(child, AREAS), undefined);
  });

  it("returns undefined when the parent also has no area", () => {
    const parent = device({ id: "parent" });
    const child = device({ id: "child", parent_device_id: "parent" });
    const devices = { parent, child };
    assert.strictEqual(getDeviceArea(child, AREAS, devices), undefined);
  });
});
