import { describe, expect, it } from "vitest";
import type { ZHADevice } from "../../../../../src/data/zha";
import {
  countBands,
  groupByArea,
  healthGroups,
  isIncomplete,
  managedDevices,
  minutesSince,
  parentByIeee,
  signalBand,
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
    device_type: "EndDevice",
    active_coordinator: false,
    signature: {},
    neighbors: [],
    routes: [],
    ...overrides,
  }) as ZHADevice;

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

describe("isIncomplete", () => {
  it("recognises a device that exposes nothing", () => {
    expect(isIncomplete(device({ ieee: "a", entities: [] }))).toBe(true);
    expect(isIncomplete(device({ ieee: "b" }))).toBe(false);
  });
});

describe("minutesSince", () => {
  it("measures against the given moment", () => {
    expect(minutesSince(minutesAgo(90), NOW)).toBe(90);
    expect(minutesSince(minutesAgo(0), NOW)).toBe(0);
  });
});

describe("parentByIeee", () => {
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

describe("healthGroups", () => {
  const noBattery = () => null;

  it("keeps the findings in a fixed order", () => {
    expect(healthGroups([], noBattery, NOW).map((g) => g.key)).toEqual([
      "incomplete",
      "weak_signal",
      "unreachable",
      "low_battery",
      "quiet",
      "routers",
    ]);
  });

  it("sorts weak devices worst first", () => {
    const groups = healthGroups(
      [
        device({ ieee: "a", lqi: 25 }),
        device({ ieee: "b", lqi: 5 }),
        device({ ieee: "c", lqi: 15 }),
      ],
      noBattery,
      NOW
    );

    const weak = groups.find((g) => g.key === "weak_signal")!;
    expect(weak.devices.map((d) => d.ieee)).toEqual(["b", "c", "a"]);
  });

  it("lists a device that has been quiet for longer than the limit", () => {
    const groups = healthGroups(
      [
        device({ ieee: "recent", last_seen: minutesAgo(89) }),
        device({ ieee: "quiet", last_seen: minutesAgo(91) }),
      ],
      noBattery,
      NOW
    );

    const quiet = groups.find((g) => g.key === "quiet")!;
    expect(quiet.devices.map((d) => d.ieee)).toEqual(["quiet"]);
  });

  it("lists low batteries emptiest first and includes the threshold", () => {
    const levels: Record<string, number> = { a: 20, b: 5, c: 21 };
    const groups = healthGroups(
      [device({ ieee: "a" }), device({ ieee: "b" }), device({ ieee: "c" })],
      (d) => levels[d.ieee],
      NOW
    );

    const battery = groups.find((g) => g.key === "low_battery")!;
    expect(battery.devices.map((d) => d.ieee)).toEqual(["b", "a"]);
    expect(battery.battery).toBe(true);
  });

  it("ignores devices without a battery sensor", () => {
    const groups = healthGroups([device({ ieee: "a" })], noBattery, NOW);

    expect(groups.find((g) => g.key === "low_battery")!.devices).toEqual([]);
  });

  it("collects routers", () => {
    const groups = healthGroups(
      [
        device({ ieee: "a", device_type: "Router" }),
        device({ ieee: "b", device_type: "EndDevice" }),
      ],
      noBattery,
      NOW
    );

    expect(
      groups.find((g) => g.key === "routers")!.devices.map((d) => d.ieee)
    ).toEqual(["a"]);
  });

  it("lets a device appear in more than one finding", () => {
    const groups = healthGroups(
      [device({ ieee: "a", lqi: 5, available: false })],
      noBattery,
      NOW
    );

    const keys = groups.filter((g) => g.devices.length).map((g) => g.key);
    expect(keys).toEqual(["weak_signal", "unreachable"]);
  });
});

describe("groupByArea", () => {
  const areaName = (d: ZHADevice) => d.area_id ?? "No area";

  it("puts the largest area first", () => {
    const groups = groupByArea(
      [
        device({ ieee: "a", area_id: "kitchen" }),
        device({ ieee: "b", area_id: "office" }),
        device({ ieee: "c", area_id: "office" }),
      ],
      areaName
    );

    expect(groups.map((g) => [g.name, g.devices.length])).toEqual([
      ["office", 2],
      ["kitchen", 1],
    ]);
  });

  it("sorts areas of equal size by name", () => {
    const groups = groupByArea(
      [
        device({ ieee: "a", area_id: "office" }),
        device({ ieee: "b", area_id: "bedroom" }),
      ],
      areaName
    );

    expect(groups.map((g) => g.name)).toEqual(["bedroom", "office"]);
  });

  it("keeps unassigned devices apart from an area of the same name", () => {
    const groups = groupByArea(
      [
        device({ ieee: "a" }),
        device({ ieee: "b", area_id: "area_1" }),
        device({ ieee: "c", area_id: "area_1" }),
      ],
      () => "No area"
    );

    expect(groups.map((g) => [g.areaId, g.devices.length])).toEqual([
      ["area_1", 2],
      ["", 1],
    ]);
  });
});
