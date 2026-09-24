import { describe, expect, it } from "vitest";

import type {
  ESPHomeBluetoothProxyCapabilities,
  ESPHomeDeviceCapabilities,
  ESPHomeZWaveProxyCapabilities,
} from "../../src/data/esphome";
import {
  countRemainingESPHomeCapabilities,
  deriveESPHomeSetupStatus,
  deviceHasMediaPlayerEntity,
  getESPHomeSetupCapabilityIds,
  hasESPHomeSetupCapabilities,
  hasStartedNonBluetoothESPHomeSetup,
  isESPHomeSerialConfigured,
  isESPHomeSetupDeferred,
  withDeferredESPHomeDevice,
} from "../../src/data/esphome_setup";
import type { SerialPortUsage } from "../../src/data/usb";

const capabilities = (
  overrides: Partial<
    Omit<ESPHomeDeviceCapabilities, "bluetooth_proxy" | "zwave_proxy">
  > & {
    bluetooth_proxy?: Partial<ESPHomeBluetoothProxyCapabilities>;
    zwave_proxy?: Partial<ESPHomeZWaveProxyCapabilities>;
  } = {}
): ESPHomeDeviceCapabilities => ({
  available: true,
  serial_proxies: [],
  ...overrides,
  bluetooth_proxy: {
    supported: false,
    ...overrides.bluetooth_proxy,
  },
  zwave_proxy: {
    supported: false,
    home_id: 0,
    config_entry_id: null,
    ...overrides.zwave_proxy,
  },
});

const deriveOptions = (
  overrides: Partial<{
    mediaPlayerSupported: boolean;
    musicAssistantLoaded: boolean;
    serialConfigured: boolean;
  }> = {}
) => ({
  mediaPlayerSupported: false,
  musicAssistantLoaded: false,
  serialConfigured: false,
  ...overrides,
});

const serialProxy = (
  url = "esphome-hass://esphome/entry?port_name=uart0",
  name = "UART"
) => ({
  name,
  port_type: "TTL" as const,
  url,
});

const serialUsage = (
  device: string,
  consumerCount = 0
): Pick<SerialPortUsage, "device" | "consumers"> => ({
  device,
  consumers: Array.from({ length: consumerCount }, (_, index) => ({
    kind: "config_entry" as const,
    title: `Consumer ${index + 1}`,
    active: true,
    domain: "monoprice",
    config_entry_id: `entry-${index}`,
    slug: null,
  })),
});

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

  it("derives connectivity from home_id and a matching zwave_js entry", () => {
    expect(
      deriveESPHomeSetupStatus(
        capabilities({
          zwave_proxy: { supported: true, home_id: 0 },
        }),
        deriveOptions()
      ).connectivity
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
          zwave_proxy: {
            supported: true,
            home_id: 123456,
            config_entry_id: "zwave-entry",
          },
        }),
        deriveOptions()
      ).connectivity
    ).toBe("completed");
  });

  it("marks serial completed only when an advertised UART is in use", () => {
    const caps = capabilities({
      serial_proxies: [serialProxy()],
    });

    expect(deriveESPHomeSetupStatus(caps, deriveOptions()).serial).toBe(
      "not-started"
    );
    expect(
      deriveESPHomeSetupStatus(caps, deriveOptions({ serialConfigured: true }))
        .serial
    ).toBe("completed");
  });
});

describe("isESPHomeSerialConfigured", () => {
  const url = "esphome-hass://esphome/entry?port_name=uart0";

  it("is true when a matching port has consumers", () => {
    expect(
      isESPHomeSerialConfigured(
        [serialProxy(url)],
        [serialUsage(url, 1), serialUsage("/dev/ttyUSB0", 1)]
      )
    ).toBe(true);
  });

  it("is false when the matching port has no consumers", () => {
    expect(
      isESPHomeSerialConfigured(
        [serialProxy(url)],
        [serialUsage(url), serialUsage("/dev/ttyUSB0", 1)]
      )
    ).toBe(false);
  });

  it("is false when consumers are on a different device URL", () => {
    expect(
      isESPHomeSerialConfigured(
        [serialProxy(url)],
        [serialUsage("esphome-hass://esphome/other?port_name=uart0", 1)]
      )
    ).toBe(false);
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

  it("treats a configured serial port as remaining-zero and started", () => {
    const status = deriveESPHomeSetupStatus(
      capabilities({
        bluetooth_proxy: { supported: true },
        serial_proxies: [serialProxy()],
      }),
      deriveOptions({ serialConfigured: true })
    );

    expect(status.serial).toBe("completed");
    expect(countRemainingESPHomeCapabilities(status)).toBe(0);
    expect(hasStartedNonBluetoothESPHomeSetup(status)).toBe(true);
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
