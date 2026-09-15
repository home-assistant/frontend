import type { ZHADevice } from "../../../../../data/zha";

/** Link quality below which a device sits at the edge of its radio range. */
export const WEAK_LQI = 30;

/** Link quality from which a device is comfortably connected. */
export const STRONG_LQI = 60;

/** Minutes without contact after which a device is listed as quiet. */
export const QUIET_MINUTES = 90;

/** Battery percentage at or below which a device is listed as running low. */
export const LOW_BATTERY = 20;

/** How the link quality of a device reads on its own. */
export type SignalBand = "strong" | "fair" | "weak" | "unknown";

/**
 * The bands of the distribution bar, worsening from left to right. A silent
 * device gets its own: its last link quality says nothing about how it is
 * doing now.
 */
export type BarBand = "strong" | "fair" | "weak" | "offline";

export const BAR_BANDS: BarBand[] = ["strong", "fair", "weak", "offline"];

export type BandCounts = Record<BarBand | "unknown", number>;

/** The findings, in the order they are listed. */
export type HealthGroupKey =
  | "incomplete"
  | "weak_signal"
  | "unreachable"
  | "low_battery"
  | "quiet"
  | "routers";

export interface HealthGroup {
  key: HealthGroupKey;
  devices: ZHADevice[];
  /** Show the battery level instead of the link quality on each row. */
  battery?: boolean;
}

export interface AreaGroup {
  /** Empty for devices that are not assigned to an area. */
  areaId: string;
  name: string;
  devices: ZHADevice[];
}

/** Battery percentage of a device, or null when it has no battery sensor. */
export type BatteryLevel = (device: ZHADevice) => number | null;

/** The devices the page reports on: everything except the coordinator. */
export const managedDevices = (devices: ZHADevice[]): ZHADevice[] =>
  devices.filter((device) => !device.active_coordinator);

export const signalBand = (device: ZHADevice): SignalBand => {
  if (device.lqi === null || device.lqi === undefined) {
    return "unknown";
  }
  if (device.lqi < WEAK_LQI) {
    return "weak";
  }
  return device.lqi < STRONG_LQI ? "fair" : "strong";
};

export const countBands = (devices: ZHADevice[]): BandCounts => {
  const counts: BandCounts = {
    strong: 0,
    fair: 0,
    weak: 0,
    offline: 0,
    unknown: 0,
  };
  for (const device of devices) {
    counts[device.available ? signalBand(device) : "offline"]++;
  }
  return counts;
};

/**
 * A device that joined the network but never finished its interview: it is
 * known to the coordinator, yet exposes nothing to control or read.
 * `pairing_status` would say so directly, but it only travels with the
 * pairing events, not with the device list this page is built on.
 */
export const isIncomplete = (device: ZHADevice): boolean =>
  device.entities.length === 0;

export const minutesSince = (lastSeen: string, now = Date.now()): number =>
  Math.round((now - new Date(lastSeen).getTime()) / 60000);

/**
 * Map each device to the router that lists it as a child, so a weak device
 * can be traced to the neighbour it depends on.
 */
export const parentByIeee = (devices: ZHADevice[]): Record<string, string> => {
  const parents: Record<string, string> = {};
  for (const device of devices) {
    for (const neighbor of device.neighbors) {
      if (neighbor.relationship === "Child") {
        parents[neighbor.ieee] = device.user_given_name || device.name;
      }
    }
  }
  return parents;
};

export const healthGroups = (
  devices: ZHADevice[],
  batteryLevel: BatteryLevel,
  now = Date.now()
): HealthGroup[] => [
  {
    key: "incomplete",
    devices: devices.filter(isIncomplete),
  },
  {
    key: "weak_signal",
    devices: devices
      .filter((device) => signalBand(device) === "weak")
      .sort((a, b) => a.lqi - b.lqi),
  },
  {
    key: "unreachable",
    devices: devices.filter((device) => !device.available),
  },
  {
    key: "low_battery",
    devices: devices
      .filter((device) => {
        const level = batteryLevel(device);
        return level !== null && level <= LOW_BATTERY;
      })
      .sort((a, b) => batteryLevel(a)! - batteryLevel(b)!),
    battery: true,
  },
  {
    key: "quiet",
    devices: devices.filter(
      (device) => minutesSince(device.last_seen, now) > QUIET_MINUTES
    ),
  },
  {
    key: "routers",
    devices: devices.filter((device) => device.device_type === "Router"),
  },
];

/**
 * Split devices by area, largest group first, so it is visible whether a
 * finding is spread over the house or concentrated in one room. Grouped by
 * id rather than by name: the name is a translated string, and unassigned
 * devices would otherwise fall in with an area that happens to carry the
 * same label.
 */
export const groupByArea = (
  devices: ZHADevice[],
  areaName: (device: ZHADevice) => string
): AreaGroup[] => {
  const byArea = new Map<string, AreaGroup>();
  for (const device of devices) {
    const areaId = device.area_id ?? "";
    const group = byArea.get(areaId);
    if (group) {
      group.devices.push(device);
    } else {
      byArea.set(areaId, {
        areaId,
        name: areaName(device),
        devices: [device],
      });
    }
  }

  return [...byArea.values()].sort((a, b) =>
    a.devices.length === b.devices.length
      ? a.name.localeCompare(b.name)
      : b.devices.length - a.devices.length
  );
};
