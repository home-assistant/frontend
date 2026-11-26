import { describe, expect, it } from "vitest";

import type { BluetoothScannerState } from "../../src/data/bluetooth";
import {
  getBluetoothAdapters,
  isScannerStateMismatch,
} from "../../src/data/bluetooth";
import type { ConfigEntry } from "../../src/data/config_entries";
import type { DeviceRegistryEntry } from "../../src/data/device/device_registry";

const state = (
  overrides: Partial<BluetoothScannerState>
): BluetoothScannerState => ({
  source: "AA:BB:CC:DD:EE:FF",
  adapter: "hci0",
  current_mode: null,
  requested_mode: null,
  ...overrides,
});

describe("isScannerStateMismatch", () => {
  it("is never a mismatch when requested mode is auto", () => {
    expect(
      isScannerStateMismatch(
        state({ requested_mode: "auto", current_mode: "passive" })
      )
    ).toBe(false);
    expect(
      isScannerStateMismatch(
        state({ requested_mode: "auto", current_mode: "active" })
      )
    ).toBe(false);
    expect(
      isScannerStateMismatch(
        state({ requested_mode: "auto", current_mode: null })
      )
    ).toBe(false);
  });

  it("flags a mismatch when requested and current differ", () => {
    expect(
      isScannerStateMismatch(
        state({ requested_mode: "active", current_mode: "passive" })
      )
    ).toBe(true);
    expect(
      isScannerStateMismatch(
        state({ requested_mode: "passive", current_mode: "active" })
      )
    ).toBe(true);
    expect(
      isScannerStateMismatch(
        state({ requested_mode: "active", current_mode: null })
      )
    ).toBe(true);
  });

  it("is not a mismatch when requested and current agree", () => {
    expect(
      isScannerStateMismatch(
        state({ requested_mode: "active", current_mode: "active" })
      )
    ).toBe(false);
    expect(
      isScannerStateMismatch(
        state({ requested_mode: "passive", current_mode: "passive" })
      )
    ).toBe(false);
  });
});

describe("getBluetoothAdapters", () => {
  const entry = (
    entry_id: string,
    overrides: Partial<ConfigEntry> = {}
  ): ConfigEntry =>
    ({
      entry_id,
      domain: "bluetooth",
      source: "user",
      disabled_by: null,
      ...overrides,
    }) as ConfigEntry;

  const device = (
    id: string,
    configEntries: string[],
    connections: [string, string][] = [["bluetooth", id]]
  ): DeviceRegistryEntry =>
    ({
      id,
      config_entries: configEntries,
      connections,
    }) as DeviceRegistryEntry;

  it("only counts entries with a Bluetooth device as adapters", () => {
    const entries = [
      entry("proxy"),
      entry("ignored", { source: "ignore" }),
      entry("removed"),
      entry("disabled", { disabled_by: "user" }),
      entry("disabled-without-device", { disabled_by: "user" }),
    ];
    const devices = {
      proxy: device("proxy", ["esphome", "proxy"]),
      disabled: device("disabled", ["disabled"]),
      "no-bluetooth": device("no-bluetooth", ["proxy"], [["mac", "x"]]),
      other: device("other", ["other-integration"]),
    };

    const result = getBluetoothAdapters(devices, entries);

    expect(result.enabledDevices.map((a) => a.device.id)).toEqual(["proxy"]);
    expect(result.disabledDevices.map((a) => a.device.id)).toEqual([
      "disabled",
    ]);
    expect(result.disabledEntriesWithoutDevice.map((e) => e.entry_id)).toEqual([
      "disabled-without-device",
    ]);
  });
});
