import { assert, describe, it } from "vitest";
import { resolveChildDevices } from "../../src/data/ws-device_registry";
import type {
  ChildDeviceRegistryEntry,
  DeviceRegistryEntry,
} from "../../src/data/device/device_registry";

const parent: DeviceRegistryEntry = {
  id: "parent",
  config_entries: ["entry-1"],
  config_entries_subentries: { "entry-1": [null] },
  connections: [["mac", "aa:bb:cc:dd:ee:ff"]],
  identifiers: [["hue", "strip-1"]],
  manufacturer: "Acme",
  model: "Power Strip",
  model_id: "PS-1",
  name: "Power strip",
  labels: ["strip"],
  sw_version: "1.0",
  hw_version: "2.0",
  serial_number: "SN-1",
  via_device_id: "bridge",
  area_id: "living_room",
  name_by_user: null,
  entry_type: null,
  disabled_by: null,
  configuration_url: "http://strip.local",
  primary_config_entry: "entry-1",
  parent_device_id: null,
  created_at: 0,
  modified_at: 0,
};

const child: ChildDeviceRegistryEntry = {
  id: "child",
  config_entry_id: "entry-1",
  config_subentry_id: "sub-1",
  identifiers: [["hue", "outlet-1"]],
  name: "Outlet 1",
  name_by_user: "Coffee machine",
  labels: ["outlet"],
  area_id: "kitchen",
  disabled_by: null,
  parent_device_id: "parent",
  created_at: 5,
  modified_at: 6,
};

describe("resolveChildDevices", () => {
  it("leaves full devices untouched", () => {
    const [resolved] = resolveChildDevices([parent]);
    assert.strictEqual(resolved, parent);
  });

  it("resolves a child into a complete device entry", () => {
    const result = resolveChildDevices([parent, child]);
    const resolved = result.find((d) => d.id === "child")!;

    // Config-entry association comes from the child's own config entry.
    assert.deepEqual(resolved.config_entries, ["entry-1"]);
    assert.deepEqual(resolved.config_entries_subentries, {
      "entry-1": ["sub-1"],
    });
    assert.strictEqual(resolved.primary_config_entry, "entry-1");

    // Hardware/display fields are inherited from the parent.
    assert.strictEqual(resolved.manufacturer, "Acme");
    assert.strictEqual(resolved.model, "Power Strip");
    assert.strictEqual(resolved.model_id, "PS-1");
    assert.strictEqual(resolved.sw_version, "1.0");
    assert.strictEqual(resolved.hw_version, "2.0");
    assert.strictEqual(resolved.serial_number, "SN-1");
    assert.strictEqual(resolved.configuration_url, "http://strip.local");
    assert.strictEqual(resolved.entry_type, null);

    // Identity fields are NOT inherited — a child is not the parent.
    assert.deepEqual(resolved.connections, []);
    assert.strictEqual(resolved.via_device_id, null);

    // The child's own fields win.
    assert.strictEqual(resolved.id, "child");
    assert.strictEqual(resolved.name, "Outlet 1");
    assert.strictEqual(resolved.name_by_user, "Coffee machine");
    assert.strictEqual(resolved.area_id, "kitchen");
    assert.deepEqual(resolved.labels, ["outlet"]);
    assert.deepEqual(resolved.identifiers, [["hue", "outlet-1"]]);
    assert.strictEqual(resolved.parent_device_id, "parent");
    assert.strictEqual(resolved.created_at, 5);
    assert.strictEqual(resolved.modified_at, 6);
  });

  it("falls back to null display fields when the parent is missing", () => {
    const [resolved] = resolveChildDevices([child]);

    assert.deepEqual(resolved.config_entries, ["entry-1"]);
    assert.strictEqual(resolved.manufacturer, null);
    assert.strictEqual(resolved.model, null);
    assert.deepEqual(resolved.connections, []);
    assert.strictEqual(resolved.via_device_id, null);
    assert.strictEqual(resolved.parent_device_id, "parent");
  });

  it("preserves ordering of the mixed list", () => {
    const result = resolveChildDevices([child, parent]);
    assert.deepEqual(
      result.map((d) => d.id),
      ["child", "parent"]
    );
  });
});
