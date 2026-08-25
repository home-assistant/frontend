import { describe, expect, it } from "vitest";

import type { ConfigEntry } from "../../src/data/config_entries";
import type { DeviceRegistryEntry } from "../../src/data/device/device_registry";
import type { ESPHomeDeviceCapabilities } from "../../src/data/esphome";
import {
  countRemainingESPHomeCapabilities,
  deriveESPHomeSetupStatus,
  deviceHasMediaPlayerEntity,
  getESPHomeSetupCapabilityIds,
  hasESPHomeSetupCapabilities,
  hasStartedNonBluetoothESPHomeSetup,
  hasZWaveJSEntryForDevice,
  isESPHomeSetupDeferred,
  withDeferredESPHomeDevice,
} from "../../src/data/esphome_setup";

const capabilities = (
  overrides: Partial<ESPHomeDeviceCapabilities> = {}
): ESPHomeDeviceCapabilities => ({
  available: true,
  bluetooth_proxy: { supported: false },
  zwave_proxy: {
    supported: false,
    home_id: 0,
  },
  serial_proxies: [],
  ...overrides,
});

const deriveOptions = (
  overrides: Partial<{
    mediaPlayerSupported: boolean;
    musicAssistantLoaded: boolean;
    zwaveJsEntryExists: boolean;
  }> = {}
) => ({
  mediaPlayerSupported: false,
  musicAssistantLoaded: false,
  zwaveJsEntryExists: false,
  ...overrides,
});

const entry = (overrides: Partial<ConfigEntry>): ConfigEntry =>
  ({
    entry_id: "entry",
    domain: "esphome",
    title: "Device",
    source: "user",
    state: "loaded",
    supports_options: true,
    supports_remove_device: false,
    supports_unload: true,
    supports_reconfigure: false,
    supported_subentry_types: {},
    num_subentries: 0,
    pref_disable_new_entities: false,
    pref_disable_polling: false,
    disabled_by: null,
    reason: null,
    error_reason_translation_key: null,
    error_reason_translation_placeholders: null,
    ...overrides,
  }) as ConfigEntry;

const device = (
  id: string,
  overrides: Partial<DeviceRegistryEntry> = {}
): DeviceRegistryEntry =>
  ({
    id,
    config_entries: [],
    via_device_id: null,
    ...overrides,
  }) as DeviceRegistryEntry;

describe("hasESPHomeSetupCapabilities", () => {
  it("is false when capabilities are missing", () => {
    expect(hasESPHomeSetupCapabilities(undefined)).toBe(false);
  });

  it("is true when advertised even if the device is unavailable", () => {
    expect(
      hasESPHomeSetupCapabilities(
        capabilities({
          available: false,
          bluetooth_proxy: { supported: true },
        }),
        { mediaPlayerSupported: true }
      )
    ).toBe(true);
  });

  it("is false for a device with no advertised capabilities", () => {
    expect(hasESPHomeSetupCapabilities(capabilities())).toBe(false);
  });

  it("is true when any capability is supported", () => {
    expect(
      hasESPHomeSetupCapabilities(
        capabilities({
          bluetooth_proxy: { supported: true },
        })
      )
    ).toBe(true);
    expect(
      hasESPHomeSetupCapabilities(capabilities(), {
        mediaPlayerSupported: true,
      })
    ).toBe(true);
    expect(
      hasESPHomeSetupCapabilities(
        capabilities({ zwave_proxy: { supported: true, home_id: 0 } })
      )
    ).toBe(true);
    expect(
      hasESPHomeSetupCapabilities(
        capabilities({
          serial_proxies: [
            {
              name: "UART",
              port_type: "TTL",
              url: "esphome-hass://proxy/uart",
            },
          ],
        })
      )
    ).toBe(true);
  });
});

describe("deviceHasMediaPlayerEntity", () => {
  it("is true when the device has a media_player entity", () => {
    expect(
      deviceHasMediaPlayerEntity("dev-1", [
        { entity_id: "sensor.proxy_rssi", device_id: "dev-1" },
        { entity_id: "media_player.proxy", device_id: "dev-1" },
      ])
    ).toBe(true);
  });

  it("ignores media players on other devices and non-media entities", () => {
    expect(
      deviceHasMediaPlayerEntity("dev-1", [
        { entity_id: "media_player.other", device_id: "dev-2" },
        { entity_id: "switch.proxy", device_id: "dev-1" },
      ])
    ).toBe(false);
  });
});

describe("deriveESPHomeSetupStatus", () => {
  it("omits rows that are not supported", () => {
    expect(deriveESPHomeSetupStatus(capabilities(), deriveOptions())).toEqual(
      {}
    );
  });

  it("marks Bluetooth completed when the proxy is compiled in", () => {
    const status = deriveESPHomeSetupStatus(
      capabilities({
        bluetooth_proxy: { supported: true },
      }),
      deriveOptions()
    );

    expect(status.bluetooth).toBe("completed");
    expect(status.audio).toBeUndefined();
    expect(status.connectivity).toBeUndefined();
    expect(status.serial).toBeUndefined();
  });

  it("marks audio from media_player entities, not capabilities", () => {
    const caps = capabilities();

    expect(
      deriveESPHomeSetupStatus(
        caps,
        deriveOptions({ mediaPlayerSupported: true })
      ).audio
    ).toBe("active");
    expect(
      deriveESPHomeSetupStatus(
        caps,
        deriveOptions({
          mediaPlayerSupported: true,
          musicAssistantLoaded: true,
        })
      ).audio
    ).toBe("completed");
    expect(
      deriveESPHomeSetupStatus(caps, deriveOptions()).audio
    ).toBeUndefined();
  });

  it("derives connectivity from home_id and a zwave_js entry", () => {
    const supported = capabilities({
      zwave_proxy: { supported: true, home_id: 0 },
    });

    expect(
      deriveESPHomeSetupStatus(supported, deriveOptions()).connectivity
    ).toBe("not-started");

    expect(
      deriveESPHomeSetupStatus(
        capabilities({
          zwave_proxy: { supported: true, home_id: 123456 },
        }),
        deriveOptions()
      ).connectivity
    ).toBe("detected");

    expect(
      deriveESPHomeSetupStatus(
        capabilities({
          zwave_proxy: { supported: true, home_id: 123456 },
        }),
        deriveOptions({ zwaveJsEntryExists: true })
      ).connectivity
    ).toBe("completed");
  });

  it("keeps serial at not-started when ports are advertised", () => {
    expect(
      deriveESPHomeSetupStatus(
        capabilities({
          serial_proxies: [
            {
              name: "RS232",
              port_type: "RS232",
              url: "esphome-hass://proxy/rs232",
            },
          ],
        }),
        deriveOptions()
      ).serial
    ).toBe("not-started");
  });
});

describe("remaining capabilities and continue-setup", () => {
  it("counts incomplete rows and ignores Bluetooth", () => {
    const status = deriveESPHomeSetupStatus(
      capabilities({
        bluetooth_proxy: { supported: true },
        zwave_proxy: { supported: true, home_id: 0 },
        serial_proxies: [
          { name: "UART", port_type: "TTL", url: "esphome-hass://proxy/uart" },
        ],
      }),
      deriveOptions({ mediaPlayerSupported: true })
    );

    expect(getESPHomeSetupCapabilityIds(status)).toEqual([
      "bluetooth",
      "audio",
      "connectivity",
      "serial",
    ]);
    expect(getESPHomeSetupCapabilityIds(status).length).toBe(4);
    expect(countRemainingESPHomeCapabilities(status)).toBe(3);
    expect(hasStartedNonBluetoothESPHomeSetup(status)).toBe(false);
  });

  it("does not count Bluetooth when the proxy is unsupported", () => {
    const status = deriveESPHomeSetupStatus(
      capabilities({
        zwave_proxy: { supported: true, home_id: 0 },
        serial_proxies: [
          { name: "UART", port_type: "TTL", url: "esphome-hass://proxy/uart" },
        ],
      }),
      deriveOptions({ mediaPlayerSupported: true })
    );

    expect(getESPHomeSetupCapabilityIds(status)).toEqual([
      "audio",
      "connectivity",
      "serial",
    ]);
    expect(getESPHomeSetupCapabilityIds(status).length).toBe(3);
  });

  it("does not treat Bluetooth-only setup as started", () => {
    const status = deriveESPHomeSetupStatus(
      capabilities({
        bluetooth_proxy: { supported: true },
      }),
      deriveOptions()
    );

    expect(countRemainingESPHomeCapabilities(status)).toBe(0);
    expect(hasStartedNonBluetoothESPHomeSetup(status)).toBe(false);
  });

  it("reports everything set up when remaining is zero", () => {
    const status = deriveESPHomeSetupStatus(
      capabilities({
        bluetooth_proxy: { supported: true },
      }),
      deriveOptions({
        mediaPlayerSupported: true,
        musicAssistantLoaded: true,
      })
    );

    expect(countRemainingESPHomeCapabilities(status)).toBe(0);
    expect(hasStartedNonBluetoothESPHomeSetup(status)).toBe(true);
  });
});

describe("hasZWaveJSEntryForDevice", () => {
  it("detects a zwave_js entry on the ESPHome device itself", () => {
    const devices = {
      esphome: device("esphome", {
        config_entries: ["esphome-entry", "zwave-entry"],
      }),
    };
    const entries = [
      entry({ entry_id: "esphome-entry", domain: "esphome" }),
      entry({ entry_id: "zwave-entry", domain: "zwave_js" }),
    ];

    expect(hasZWaveJSEntryForDevice("esphome", devices, entries)).toBe(true);
  });

  it("detects a child device via this ESPHome device", () => {
    const devices = {
      esphome: device("esphome", { config_entries: ["esphome-entry"] }),
      controller: device("controller", {
        config_entries: ["zwave-entry"],
        via_device_id: "esphome",
      }),
    };
    const entries = [
      entry({ entry_id: "esphome-entry", domain: "esphome" }),
      entry({ entry_id: "zwave-entry", domain: "zwave_js" }),
    ];

    expect(hasZWaveJSEntryForDevice("esphome", devices, entries)).toBe(true);
  });

  it("ignores disabled zwave_js entries and unrelated devices", () => {
    const devices = {
      esphome: device("esphome", { config_entries: ["esphome-entry"] }),
      other: device("other", {
        config_entries: ["zwave-disabled"],
        via_device_id: "someone-else",
      }),
    };
    const entries = [
      entry({ entry_id: "esphome-entry", domain: "esphome" }),
      entry({
        entry_id: "zwave-disabled",
        domain: "zwave_js",
        disabled_by: "user",
      }),
    ];

    expect(hasZWaveJSEntryForDevice("esphome", devices, entries)).toBe(false);
  });
});

describe("Later persistence helpers", () => {
  it("tracks deferred device ids per user data", () => {
    expect(isESPHomeSetupDeferred(undefined, "dev-1")).toBe(false);
    expect(isESPHomeSetupDeferred({ setupDeferred: ["dev-1"] }, "dev-1")).toBe(
      true
    );

    const next = withDeferredESPHomeDevice(
      { setupDeferred: ["dev-1"] },
      "dev-2"
    );
    expect(next.setupDeferred).toEqual(["dev-1", "dev-2"]);
    expect(withDeferredESPHomeDevice(next, "dev-1").setupDeferred).toEqual([
      "dev-1",
      "dev-2",
    ]);
  });
});
