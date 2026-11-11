import { describe, expect, it } from "vitest";
import type { ZHADevice } from "../../../../../src/data/zha";
import { ZHADeviceType } from "../../../../../src/data/zha";
import type { DeviceReadings } from "../../../../../src/panels/config/integrations/integration-panels/zha/network-health";
import {
  attentionCount,
  countBands,
  findings,
  isSetupUnfinished,
  lastSeenAt,
  managedDevices,
  parentByIeee,
  powerSource,
  signalBand,
  sortByArea,
} from "../../../../../src/panels/config/integrations/integration-panels/zha/network-health";

const NOW = new Date("2026-01-01T12:00:00Z").getTime();

const minutesAgo = (minutes: number) =>
  new Date(NOW - minutes * 60000).toISOString();

const device = (overrides: Partial<ZHADevice> & { ieee: string }): ZHADevice =>
  ({
    available: true,
    name: overrides.ieee,
    nwk: 0,
    lqi: 200,
    rssi: "-50",
    last_seen: minutesAgo(1),
    manufacturer: "ACME",
    model: "Model",
    quirk_applied: false,
    quirk_class: "",
    entities: [{ entity_id: "sensor.test" }],
    manufacturer_code: 0,
    device_reg_id: overrides.ieee,
    device_type: ZHADeviceType.EndDevice,
    active_coordinator: false,
    signature: {},
    neighbors: [],
    routes: [],
    ...overrides,
  }) as ZHADevice;

const noReadings: DeviceReadings = {
  batteryLevel: () => null,
  firmwareUpdate: () => null,
};

describe("signalBand", () => {
  it("reads the link quality in three steps", () => {
    expect(signalBand(device({ ieee: "a", lqi: 200 }))).toBe("strong");
    expect(signalBand(device({ ieee: "b", lqi: 45 }))).toBe("fair");
    expect(signalBand(device({ ieee: "c", lqi: 12 }))).toBe("weak");
  });

  it("puts the thresholds themselves in the better band", () => {
    expect(signalBand(device({ ieee: "a", lqi: 60 }))).toBe("strong");
    expect(signalBand(device({ ieee: "b", lqi: 59 }))).toBe("fair");
    expect(signalBand(device({ ieee: "c", lqi: 30 }))).toBe("fair");
    expect(signalBand(device({ ieee: "d", lqi: 29 }))).toBe("weak");
  });

  it("does not guess when there is no reading", () => {
    expect(signalBand(device({ ieee: "a", lqi: null as any }))).toBe("unknown");
    expect(signalBand(device({ ieee: "b", lqi: undefined as any }))).toBe(
      "unknown"
    );
  });

  it("counts a link quality of zero as weak, not as missing", () => {
    expect(signalBand(device({ ieee: "a", lqi: 0 }))).toBe("weak");
  });
});

describe("countBands", () => {
  it("counts every device exactly once", () => {
    const counts = countBands([
      device({ ieee: "a", lqi: 200 }),
      device({ ieee: "b", lqi: 100 }),
      device({ ieee: "c", lqi: 45 }),
      device({ ieee: "d", lqi: 12 }),
      device({ ieee: "e", lqi: null as any }),
    ]);

    expect(counts).toEqual({
      strong: 2,
      fair: 1,
      weak: 1,
      offline: 0,
      unknown: 1,
    });
  });

  it("reports a silent device as offline, not by its last reading", () => {
    const counts = countBands([
      device({ ieee: "a", lqi: 200 }),
      device({ ieee: "b", lqi: 200, available: false }),
    ]);

    expect(counts.strong).toBe(1);
    expect(counts.offline).toBe(1);
  });
});

describe("managedDevices", () => {
  it("leaves out the coordinator", () => {
    const devices = managedDevices([
      device({ ieee: "coordinator", active_coordinator: true }),
      device({ ieee: "a" }),
    ]);

    expect(devices.map((d) => d.ieee)).toEqual(["a"]);
  });
});

describe("isSetupUnfinished", () => {
  it("recognises a device that exposes nothing", () => {
    expect(isSetupUnfinished(device({ ieee: "a", entities: [] }))).toBe(true);
    expect(isSetupUnfinished(device({ ieee: "b" }))).toBe(false);
  });
});

describe("powerSource", () => {
  it("reads mains and battery, and does not guess otherwise", () => {
    expect(powerSource(device({ ieee: "a", power_source: "Mains" }))).toBe(
      "mains"
    );
    expect(
      powerSource(device({ ieee: "b", power_source: "Battery or Unknown" }))
    ).toBe("battery");
    expect(powerSource(device({ ieee: "c" }))).toBeUndefined();
  });
});

describe("lastSeenAt", () => {
  it("reads a valid stamp and drops an empty or malformed one", () => {
    expect(lastSeenAt(device({ ieee: "a" }))?.getTime()).toBe(
      new Date(minutesAgo(1)).getTime()
    );
    expect(lastSeenAt(device({ ieee: "b", last_seen: "" }))).toBeUndefined();
    expect(
      lastSeenAt(device({ ieee: "c", last_seen: "not a date" }))
    ).toBeUndefined();
  });
});

describe("parentByIeee", () => {
  it("skips the neighbour table of an unavailable router", () => {
    const parents = parentByIeee([
      device({
        ieee: "old-router",
        available: false,
        user_given_name: "Old plug",
        neighbors: [
          {
            ieee: "child",
            nwk: "1",
            lqi: "60",
            depth: "1",
            relationship: "Child",
          },
        ],
      }),
      device({
        ieee: "router",
        user_given_name: "Hallway plug",
        neighbors: [
          {
            ieee: "child",
            nwk: "1",
            lqi: "60",
            depth: "1",
            relationship: "Child",
          },
        ],
      }),
      device({ ieee: "child" }),
    ]);

    expect(parents).toEqual({ child: "Hallway plug" });
  });

  it("names the router a device hangs off", () => {
    const parents = parentByIeee([
      device({
        ieee: "router",
        user_given_name: "Hallway plug",
        neighbors: [
          {
            ieee: "child",
            nwk: "1",
            lqi: "60",
            depth: "1",
            relationship: "Child",
          },
          {
            ieee: "sibling",
            nwk: "2",
            lqi: "60",
            depth: "1",
            relationship: "Sibling",
          },
        ],
      }),
      device({ ieee: "child" }),
    ]);

    expect(parents).toEqual({ child: "Hallway plug" });
  });

  it("falls back to the device name when the user gave none", () => {
    const parents = parentByIeee([
      device({
        ieee: "router",
        name: "0x1234",
        neighbors: [
          {
            ieee: "child",
            nwk: "1",
            lqi: "60",
            depth: "1",
            relationship: "Child",
          },
        ],
      }),
    ]);

    expect(parents.child).toBe("0x1234");
  });
});

describe("findings", () => {
  it("lists offline devices and devices whose setup did not finish", () => {
    const found = findings(
      [
        device({ ieee: "off", available: false }),
        device({ ieee: "empty", entities: [] }),
        device({ ieee: "fine" }),
      ],
      noReadings
    );

    expect(found.offline.map((d) => d.ieee)).toEqual(["off"]);
    expect(found.setup_unfinished.map((d) => d.ieee)).toEqual(["empty"]);
  });

  it("sorts weak devices worst first", () => {
    const found = findings(
      [
        device({ ieee: "a", lqi: 25 }),
        device({ ieee: "b", lqi: 5 }),
        device({ ieee: "c", lqi: 15 }),
      ],
      noReadings
    );

    expect(found.weak_signal.map((d) => d.ieee)).toEqual(["b", "c", "a"]);
  });

  it("lists an offline device only as offline, not by its last readings", () => {
    const found = findings([device({ ieee: "a", lqi: 5, available: false })], {
      ...noReadings,
      batteryLevel: () => 3,
    });

    expect(found.offline.map((d) => d.ieee)).toEqual(["a"]);
    expect(found.weak_signal).toEqual([]);
    expect(found.low_battery).toEqual([]);
  });

  it("lists low batteries emptiest first and includes the threshold", () => {
    const levels: Record<string, number> = { a: 20, b: 5, c: 21 };
    const found = findings(
      [device({ ieee: "a" }), device({ ieee: "b" }), device({ ieee: "c" })],
      { ...noReadings, batteryLevel: (d) => levels[d.ieee] }
    );

    expect(found.low_battery.map((d) => d.ieee)).toEqual(["b", "a"]);
  });

  it("ignores devices without a battery sensor", () => {
    expect(findings([device({ ieee: "a" })], noReadings).low_battery).toEqual(
      []
    );
  });

  it("lists devices with a pending firmware update", () => {
    const found = findings([device({ ieee: "a" }), device({ ieee: "b" })], {
      ...noReadings,
      firmwareUpdate: (d) =>
        d.ieee === "a" ? { installed: "1.0", latest: "1.1" } : null,
    });

    expect(found.firmware_update.map((d) => d.ieee)).toEqual(["a"]);
  });
});

describe("attentionCount", () => {
  it("counts a device that is offline and not set up only once", () => {
    const found = findings(
      [
        device({ ieee: "a", available: false, entities: [] }),
        device({ ieee: "b", available: false }),
        device({ ieee: "c", lqi: 5 }),
      ],
      noReadings
    );

    expect(attentionCount(found)).toBe(2);
  });
});

describe("sortByArea", () => {
  const areas: Record<string, string> = { kitchen: "Kitchen", attic: "Attic" };
  const areaName = (d: ZHADevice) => (d.area_id ? areas[d.area_id] : undefined);
  const name = (d: ZHADevice) => d.name;

  it("sorts by area, then by name, with unassigned devices last", () => {
    const sorted = sortByArea(
      [
        device({ ieee: "z", name: "Zeta" }),
        device({ ieee: "k2", name: "Lamp", area_id: "kitchen" }),
        device({ ieee: "a", name: "Plug", area_id: "attic" }),
        device({ ieee: "k1", name: "Bulb", area_id: "kitchen" }),
      ],
      areaName,
      name
    );

    expect(sorted.map((d) => d.ieee)).toEqual(["a", "k1", "k2", "z"]);
  });
});
