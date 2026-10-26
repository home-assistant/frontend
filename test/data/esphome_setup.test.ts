import { describe, expect, it } from "vitest";

import type {
  ESPHomeBluetoothProxyCapabilities,
  ESPHomeDeviceCapabilities,
  ESPHomeWizardPage,
  ESPHomeZWaveProxyCapabilities,
} from "../../src/data/esphome";
import {
  countRemainingESPHomeCapabilities,
  deriveESPHomeSetupStatus,
  deviceHasMediaPlayerEntity,
  findESPHomeZWaveFlow,
  getESPHomeAudioControls,
  getESPHomeSetupBannerState,
  getESPHomeSetupCapabilityIds,
  getESPHomeSwitch,
  getESPHomeWizardSwitches,
  hasESPHomeBluetoothSwitch,
  hasESPHomeSetupCapabilities,
  hasStartedNonBluetoothESPHomeSetup,
  isESPHomeSerialConfigured,
  isMusicAssistantConfigured,
  isESPHomeSetupDeferred,
  withDeferredESPHomeDevice,
} from "../../src/data/esphome_setup";
import type { DataEntryFlowProgress } from "../../src/data/data_entry_flow";
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
    musicAssistantConfigured: boolean;
    sendspinSupported: boolean;
    sendspinEnabled: boolean;
    serialConfigured: boolean;
    zwaveFlowInProgress: boolean;
  }> = {}
) => ({
  mediaPlayerSupported: false,
  musicAssistantConfigured: false,
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

  it.each([
    [true, true, true],
    [false, true, false],
    [false, false, true],
  ])(
    "is %s for Bluetooth alone with capability %s and switch %s",
    (expected, supported, bluetoothSwitch) => {
      expect(
        hasESPHomeSetupCapabilities(
          capabilities({
            bluetooth_proxy: { supported },
          }),
          { bluetoothSwitch }
        )
      ).toBe(expected);
    }
  );

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

  it("marks Bluetooth not started when its switch is off", () => {
    const status = deriveESPHomeSetupStatus(
      capabilities({
        bluetooth_proxy: { supported: true },
      }),
      { ...deriveOptions(), bluetoothEnabled: false }
    );

    expect(status.bluetooth).toBe("not-started");
    expect(countRemainingESPHomeCapabilities(status)).toBe(1);
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
          musicAssistantConfigured: true,
        })
      ).audio
    ).toBe("completed");
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
          musicAssistantConfigured: true,
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
          musicAssistantConfigured: true,
          sendspinSupported: true,
          sendspinEnabled: true,
        })
      ).audio
    ).toBe("completed");
  });

  it("keeps audio completed while the Sendspin switch is unavailable", () => {
    expect(
      deriveESPHomeSetupStatus(
        capabilities(),
        deriveOptions({
          musicAssistantConfigured: true,
          sendspinSupported: true,
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

  it("marks connectivity detected when a discovery flow exists despite home_id 0", () => {
    expect(
      deriveESPHomeSetupStatus(
        capabilities({
          zwave_proxy: { supported: true, home_id: 0 },
        }),
        deriveOptions({ zwaveFlowInProgress: true })
      ).connectivity
    ).toBe("detected");
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

  it("leaves serial unset when USB usage was not loaded", () => {
    const caps = capabilities({
      serial_proxies: [serialProxy()],
    });

    expect(
      deriveESPHomeSetupStatus(caps, {
        mediaPlayerSupported: false,
        musicAssistantConfigured: false,
      }).serial
    ).toBeUndefined();
  });
});

describe("findESPHomeZWaveFlow", () => {
  const flow = (
    context: DataEntryFlowProgress["context"],
    handler = "zwave_js"
  ): DataEntryFlowProgress => ({
    flow_id: `${handler}-${JSON.stringify(context)}`,
    handler,
    step_id: "installation_type",
    context,
  });
  const fromDevice = flow({
    source: "esphome",
    unique_id: "3551671779",
    discovery_key: { domain: "esphome", key: "20:F8:3B:17:08:A8", version: 1 },
  });

  it("matches the flow by the device MAC, ignoring case and separators", () => {
    expect(findESPHomeZWaveFlow([fromDevice], "20:f8:3b:17:08:a8")).toBe(
      fromDevice
    );
    const rawKey = flow({
      ...fromDevice.context,
      discovery_key: { domain: "esphome", key: "20F83B1708A8", version: 1 },
    });
    expect(findESPHomeZWaveFlow([rawKey], "20:f8:3b:17:08:a8")).toBe(rawKey);
  });

  it("ignores flows from other devices", () => {
    expect(
      findESPHomeZWaveFlow(
        [
          fromDevice,
          flow({ ...fromDevice.context, source: "usb" }),
          flow(fromDevice.context, "zha"),
        ],
        "aa:bb:cc:dd:ee:ff"
      )
    ).toBeUndefined();
  });

  it("does not match flows without an ESPHome discovery key", () => {
    const legacy = flow({ source: "esphome", unique_id: "3551671779" });
    const otherKey = flow({
      source: "esphome",
      discovery_key: { domain: "usb", key: "20:F8:3B:17:08:A8", version: 1 },
    });
    expect(
      findESPHomeZWaveFlow([legacy, otherKey], "20:F8:3B:17:08:A8")
    ).toBeUndefined();
    expect(findESPHomeZWaveFlow([fromDevice], undefined)).toBeUndefined();
  });

  it("ignores same-MAC flows from other sources and integrations", () => {
    expect(
      findESPHomeZWaveFlow(
        [
          flow({ ...fromDevice.context, source: "usb" }),
          flow(fromDevice.context, "zha"),
        ],
        "20:F8:3B:17:08:A8"
      )
    ).toBeUndefined();
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

describe("isMusicAssistantConfigured", () => {
  it.each([
    ["no entries", undefined, false],
    ["another integration", [{ domain: "esphome", source: "user" }], false],
    [
      "an ignored discovery",
      [{ domain: "music_assistant", source: "ignore" }],
      false,
    ],
    ["an entry", [{ domain: "music_assistant", source: "hassio" }], true],
  ])("handles %s", (_name, entries, expected) => {
    expect(isMusicAssistantConfigured(entries)).toBe(expected);
  });
});

describe("remaining capabilities and continue-setup", () => {
  it("counts incomplete rows, with Bluetooth completed when it has no switch", () => {
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

  it("completes audio without a Sendspin switch once Music Assistant is installed", () => {
    const withoutSwitch = deriveESPHomeSetupStatus(
      capabilities({
        bluetooth_proxy: { supported: true },
      }),
      deriveOptions({
        mediaPlayerSupported: true,
        musicAssistantConfigured: true,
      })
    );
    expect(countRemainingESPHomeCapabilities(withoutSwitch)).toBe(0);
    expect(hasStartedNonBluetoothESPHomeSetup(withoutSwitch)).toBe(true);

    const switchOff = deriveESPHomeSetupStatus(
      capabilities({
        bluetooth_proxy: { supported: true },
      }),
      deriveOptions({
        mediaPlayerSupported: true,
        musicAssistantConfigured: true,
        sendspinSupported: true,
        sendspinEnabled: false,
      })
    );
    expect(countRemainingESPHomeCapabilities(switchOff)).toBe(1);
    expect(getESPHomeSetupBannerState(switchOff)).toBe("setup");

    const switchOn = deriveESPHomeSetupStatus(
      capabilities({
        bluetooth_proxy: { supported: true },
      }),
      deriveOptions({
        mediaPlayerSupported: true,
        musicAssistantConfigured: true,
        sendspinSupported: true,
        sendspinEnabled: true,
      })
    );
    expect(countRemainingESPHomeCapabilities(switchOn)).toBe(0);
    expect(hasStartedNonBluetoothESPHomeSetup(switchOn)).toBe(true);
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

  it("treats a detected Z-Wave controller as started setup", () => {
    const status = deriveESPHomeSetupStatus(
      capabilities({
        zwave_proxy: { supported: true, home_id: 123456 },
      }),
      deriveOptions()
    );

    expect(status.connectivity).toBe("detected");
    expect(hasStartedNonBluetoothESPHomeSetup(status)).toBe(true);
    expect(getESPHomeSetupBannerState(status)).toBe("continue");
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

describe("getESPHomeWizardSwitches", () => {
  const page = (
    title: string,
    entityIds: (string | null)[]
  ): ESPHomeWizardPage => ({
    title,
    description: "",
    entities: entityIds.map((entity_id) => ({ entity_id, description: "" })),
  });

  it("takes the switches from the Bluetooth and Sendspin pages by title", () => {
    expect(
      getESPHomeWizardSwitches({
        pages: [
          page("Sendspin", [
            "switch.proxy_sendspin",
            "switch.proxy_sendspin_unpaired_access",
          ]),
          page(" bluetooth ", ["switch.proxy_bluetooth"]),
          page("Lights", ["switch.proxy_light"]),
        ],
      })
    ).toEqual({
      bluetooth: "switch.proxy_bluetooth",
      sendspin: "switch.proxy_sendspin",
      sendspinUnpairedAccess: "switch.proxy_sendspin_unpaired_access",
    });
  });

  it("skips entities that are not switches, keeping the order", () => {
    expect(
      getESPHomeWizardSwitches({
        pages: [
          page("Sendspin", [
            "media_player.proxy_sendspin",
            "switch.proxy_sendspin_unpaired_access",
          ]),
        ],
      })
    ).toEqual({
      bluetooth: undefined,
      sendspin: undefined,
      sendspinUnpairedAccess: "switch.proxy_sendspin_unpaired_access",
    });
  });

  it.each([
    ["no wizard", undefined],
    ["no matching pages", { pages: [page("Lights", ["switch.proxy_light"])] }],
    [
      "entities without an entity id",
      { pages: [page("Bluetooth", [null]), page("Sendspin", [])] },
    ],
  ])("finds no switches with %s", (_name, wizard) => {
    expect(getESPHomeWizardSwitches(wizard)).toEqual({
      bluetooth: undefined,
      sendspin: undefined,
      sendspinUnpairedAccess: undefined,
    });
  });
});

describe("getESPHomeSwitch", () => {
  it("reads the switch state", () => {
    expect(
      getESPHomeSwitch("switch.proxy_bluetooth", {
        "switch.proxy_bluetooth": { state: "off" },
      })
    ).toEqual({ entityId: "switch.proxy_bluetooth", on: false });
  });

  it.each([
    ["no wizard switch", undefined, {}],
    ["a disabled switch without a state", "switch.proxy_bluetooth", {}],
    [
      "an unavailable switch",
      "switch.proxy_bluetooth",
      { "switch.proxy_bluetooth": { state: "unavailable" } },
    ],
  ])("ignores %s", (_name, entityId, states) => {
    expect(getESPHomeSwitch(entityId, states)).toBeUndefined();
  });

  it("counts an enabled switch as present, but not a disabled one", () => {
    const entities = [
      { entity_id: "switch.proxy_bluetooth", disabled_by: null },
      { entity_id: "switch.disabled_bluetooth", disabled_by: "integration" },
    ];
    expect(hasESPHomeBluetoothSwitch("switch.proxy_bluetooth", entities)).toBe(
      true
    );
    expect(
      hasESPHomeBluetoothSwitch("switch.disabled_bluetooth", entities)
    ).toBe(false);
    expect(hasESPHomeBluetoothSwitch(undefined, entities)).toBe(false);
  });
});

describe("getESPHomeAudioControls", () => {
  const sendspin = {
    entity_id: "switch.proxy_sendspin",
    device_id: "dev-1",
    platform: "esphome",
  };

  it("uses the wizard's Sendspin switch without inverting it", () => {
    expect(
      getESPHomeAudioControls(
        "dev-1",
        [sendspin],
        { "switch.proxy_sendspin": { state: "on" } },
        "switch.proxy_sendspin"
      )
    ).toEqual({
      supported: true,
      sendspinEntityId: "switch.proxy_sendspin",
      sendspinOn: true,
    });
  });

  it.each([
    ["without the wizard", [sendspin], undefined],
    [
      "for a disabled switch",
      [{ ...sendspin, disabled_by: "user" }],
      "switch.proxy_sendspin",
    ],
  ])(
    "finds no Sendspin switch %s",
    (_name, entities, wizardSendspinEntityId) => {
      expect(
        getESPHomeAudioControls(
          "dev-1",
          entities,
          { "switch.proxy_sendspin": { state: "on" } },
          wizardSendspinEntityId
        )
      ).toEqual({
        supported: false,
        sendspinEntityId: undefined,
        sendspinOn: undefined,
      });
    }
  );
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
