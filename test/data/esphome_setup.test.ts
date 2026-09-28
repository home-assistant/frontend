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
  getESPHomeAudioControls,
  getESPHomeSetupBannerState,
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
    sendspinSupported: boolean;
    sendspinEnabled: boolean;
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

  it("is false for Bluetooth alone", () => {
    expect(
      hasESPHomeSetupCapabilities(
        capabilities({
          bluetooth_proxy: { supported: true },
        })
      )
    ).toBe(false);
  });

  it("is false for a device with no advertised capabilities", () => {
    expect(hasESPHomeSetupCapabilities(capabilities())).toBe(false);
  });

  it("is true when music, Z-Wave, or serial is supported", () => {
    expect(
      hasESPHomeSetupCapabilities(
        capabilities({
          bluetooth_proxy: { supported: true },
        }),
        { mediaPlayerSupported: true }
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
    ).toBe("not-started");
    expect(
      deriveESPHomeSetupStatus(
        caps,
        deriveOptions({
          mediaPlayerSupported: true,
          musicAssistantLoaded: true,
        })
      ).audio
    ).toBe("not-started");
    expect(
      deriveESPHomeSetupStatus(caps, deriveOptions()).audio
    ).toBeUndefined();
  });

  it("keeps audio incomplete until Sendspin is on", () => {
    const caps = capabilities();

    expect(
      deriveESPHomeSetupStatus(
        caps,
        deriveOptions({
          mediaPlayerSupported: true,
          musicAssistantLoaded: true,
          sendspinSupported: true,
          sendspinEnabled: false,
        })
      ).audio
    ).toBe("not-started");
    expect(
      deriveESPHomeSetupStatus(
        caps,
        deriveOptions({
          mediaPlayerSupported: true,
          musicAssistantLoaded: true,
          sendspinSupported: true,
          sendspinEnabled: true,
        })
      ).audio
    ).toBe("completed");
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
    expect(getESPHomeSetupBannerState(status)).toBe("setup");
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

  it("reports everything set up only when Sendspin is on", () => {
    const incomplete = deriveESPHomeSetupStatus(
      capabilities({
        bluetooth_proxy: { supported: true },
      }),
      deriveOptions({
        mediaPlayerSupported: true,
        musicAssistantLoaded: true,
      })
    );
    expect(countRemainingESPHomeCapabilities(incomplete)).toBe(1);
    expect(hasStartedNonBluetoothESPHomeSetup(incomplete)).toBe(false);
    expect(getESPHomeSetupBannerState(incomplete)).toBe("setup");

    const status = deriveESPHomeSetupStatus(
      capabilities({
        bluetooth_proxy: { supported: true },
      }),
      deriveOptions({
        mediaPlayerSupported: true,
        musicAssistantLoaded: true,
        sendspinSupported: true,
        sendspinEnabled: true,
      })
    );

    expect(countRemainingESPHomeCapabilities(status)).toBe(0);
    expect(hasStartedNonBluetoothESPHomeSetup(status)).toBe(true);
    expect(getESPHomeSetupBannerState(status)).toBe("complete");
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
    expect(getESPHomeSetupBannerState(status)).toBe("complete");
  });

  it("keeps the continue headline while other non-Bluetooth work remains", () => {
    const status = deriveESPHomeSetupStatus(
      capabilities({
        zwave_proxy: {
          supported: true,
          home_id: 123456,
          config_entry_id: "zwave-entry",
        },
        serial_proxies: [serialProxy()],
      }),
      deriveOptions()
    );

    expect(countRemainingESPHomeCapabilities(status)).toBe(1);
    expect(getESPHomeSetupBannerState(status)).toBe("continue");
  });
});

describe("getESPHomeAudioControls", () => {
  const entities = [
    {
      entity_id: "media_player.proxy",
      device_id: "dev-1",
      platform: "esphome",
    },
    {
      entity_id: "switch.proxy_sendspin",
      device_id: "dev-1",
      platform: "esphome",
      name: "Sendspin",
    },
    {
      entity_id: "switch.proxy_require_pin_to_play_audio",
      device_id: "dev-1",
      platform: "esphome",
      name: "Require PIN to play audio",
    },
    {
      entity_id: "switch.other_sendspin",
      device_id: "dev-2",
      platform: "esphome",
      name: "Sendspin",
    },
  ];

  it("maps Sendspin and an inverted require-PIN switch", () => {
    expect(
      getESPHomeAudioControls("dev-1", entities, {
        "switch.proxy_sendspin": { state: "on" },
        "switch.proxy_require_pin_to_play_audio": { state: "off" },
      })
    ).toMatchObject({
      supported: true,
      sendspinEntityId: "switch.proxy_sendspin",
      sendspinOn: true,
      guestEntityId: "switch.proxy_require_pin_to_play_audio",
      guestOn: true,
      guestRequiresPin: true,
    });
  });

  it("ignores unrelated switches on a device whose name contains guest", () => {
    expect(
      getESPHomeAudioControls(
        "dev-1",
        [
          {
            entity_id: "switch.guest_room_night_light",
            device_id: "dev-1",
            platform: "esphome",
            name: "Night light",
          },
          {
            entity_id: "switch.guest_room_sendspin",
            device_id: "dev-1",
            platform: "esphome",
            translation_key: "sendspin",
          },
          {
            entity_id: "switch.guest_room_require_pin_to_stream",
            device_id: "dev-1",
            platform: "esphome",
            name: "Require PIN to stream",
          },
        ],
        {
          "switch.guest_room_night_light": {
            state: "on",
            attributes: { friendly_name: "Guest room Night light" },
          },
          "switch.guest_room_sendspin": {
            state: "off",
            attributes: { friendly_name: "Guest room Sendspin" },
          },
          "switch.guest_room_require_pin_to_stream": {
            state: "on",
            attributes: { friendly_name: "Guest room Require PIN to stream" },
          },
        }
      )
    ).toMatchObject({
      sendspinEntityId: "switch.guest_room_sendspin",
      sendspinOn: false,
      guestEntityId: "switch.guest_room_require_pin_to_stream",
      guestOn: false,
      guestRequiresPin: true,
    });
  });

  it("treats a guest-mode switch as open access when it is on", () => {
    expect(
      getESPHomeAudioControls(
        "dev-1",
        [
          {
            entity_id: "switch.proxy_sendspin_guest_mode",
            device_id: "dev-1",
            platform: "esphome",
            name: "Sendspin Guest mode",
          },
        ],
        {
          "switch.proxy_sendspin_guest_mode": { state: "on" },
        }
      )
    ).toMatchObject({
      sendspinEntityId: undefined,
      guestEntityId: "switch.proxy_sendspin_guest_mode",
      guestOn: true,
      guestRequiresPin: false,
    });
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
