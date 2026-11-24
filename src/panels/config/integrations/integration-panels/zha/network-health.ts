import type { ZHADevice } from "../../../../../data/zha";
import { ZHADeviceType } from "../../../../../data/zha";

/** Link quality below which a device sits at the edge of its radio range. */
export const WEAK_LQI = 30;

/** Link quality from which a device is comfortably connected. */
export const STRONG_LQI = 60;

/** Battery percentage at or below which a device is listed as running low. */
export const LOW_BATTERY = 20;

/** How the link quality of a device reads on its own. */
export type SignalBand = "strong" | "fair" | "weak" | "unknown";

/**
 * The bands of the distribution bar, worsening from left to right. An offline
 * device gets its own: its last link quality says nothing about how it is
 * doing now.
 */
export type BarBand = "strong" | "fair" | "weak" | "offline";

export const BAR_BANDS: BarBand[] = ["strong", "fair", "weak", "offline"];

export type BandCounts = Record<BarBand | "unknown", number>;

/** Findings that stop a device from working. */
export type AttentionKey = "offline" | "setup_unfinished";

/** Findings that are worth knowing but do not stop anything. */
export type WorthALookKey = "weak_signal" | "low_battery";

/** What the page reports on a device. */
export type FindingKey = AttentionKey | WorthALookKey;

/**
 * Findings that stop a device from working. Listed with their devices right
 * on the page, like repairs.
 */
export const NEEDS_ATTENTION: AttentionKey[] = ["offline", "setup_unfinished"];

/**
 * Findings that are worth knowing but do not stop anything. Each has its own
 * subpage, reached from a single row on the page.
 */
export const WORTH_A_LOOK: WorthALookKey[] = ["weak_signal", "low_battery"];

export type Findings = Record<FindingKey, ZHADevice[]>;

/** Readings that live in the registries and entity states rather than in the device list. */
export interface DeviceReadings {
  /** Battery percentage, or null when the device has no battery sensor. */
  batteryLevel: (device: ZHADevice) => number | null;
  /** Whether the device is disabled in the device registry. */
  isDisabled: (device: ZHADevice) => boolean;
  /**
   * Whether the entity registry holds any entity of the device, disabled ones
   * included. The device list only carries entities that were added.
   */
  hasRegisteredEntities: (device: ZHADevice) => boolean;
}

export type PowerSource = "mains" | "battery";

/** The registry ids of all devices that own at least one entity. */
export const devicesWithEntities = (
  entities:
    | Record<string, { device_id?: string | null }>
    | { device_id?: string | null }[]
): Set<string> =>
  new Set(
    Object.values(entities)
      .map((entity) => entity.device_id)
      .filter((id): id is string => Boolean(id))
  );

/** The devices the page reports on: everything except the coordinator. */
export const managedDevices = (devices: ZHADevice[]): ZHADevice[] =>
  devices.filter((device) => !device.active_coordinator);

/** Link quality per device IEEE, as reported by its neighbours. */
export type LinkQualities = Record<string, number>;

/**
 * The link quality the neighbour tables report for each device. The value of
 * the last packet swings with every message; a neighbour table entry is the
 * router's own running estimate of the link and reads much steadier. zigpy
 * rescans the tables every few hours, so it can lag behind a sudden change.
 *
 * An end device uses the entry of the router it is a child of: that is the
 * link it actually depends on. A router routes over the whole mesh, so it
 * uses the best entry any neighbour reports, whatever the relationship: a
 * router with one good link is still reachable, and a single neighbour whose
 * firmware reports near-zero values for everything does not drag it down.
 * An end device without a current parent entry falls back to its last
 * packet. Unavailable routers are skipped, as their tables may be stale.
 */
export const neighborLinkQualities = (devices: ZHADevice[]): LinkQualities => {
  const endDevices = new Set(
    devices
      .filter((device) => device.device_type === ZHADeviceType.EndDevice)
      .map((device) => device.ieee)
  );
  const best: LinkQualities = {};
  const parent: LinkQualities = {};
  for (const router of devices) {
    if (!router.available) {
      continue;
    }
    for (const neighbor of router.neighbors) {
      const lqi = Number(neighbor.lqi);
      if (neighbor.lqi === "" || isNaN(lqi)) {
        continue;
      }
      if (endDevices.has(neighbor.ieee)) {
        // Only the current parent counts: a former parent may still list
        // the device as a previous child with a stale reading.
        if (neighbor.relationship === "Child") {
          parent[neighbor.ieee] = lqi;
        }
        continue;
      }
      best[neighbor.ieee] = Math.max(best[neighbor.ieee] ?? -1, lqi);
    }
  }
  return { ...best, ...parent };
};

/**
 * The link quality shown for a device: from the neighbour tables when they
 * list it, otherwise from its last packet.
 */
export const linkQuality = (
  device: ZHADevice,
  links: LinkQualities = {}
): number | null => links[device.ieee] ?? device.lqi ?? null;

export const signalBand = (
  device: ZHADevice,
  links: LinkQualities = {}
): SignalBand => {
  const lqi = linkQuality(device, links);
  if (lqi === null) {
    return "unknown";
  }
  if (lqi < WEAK_LQI) {
    return "weak";
  }
  return lqi < STRONG_LQI ? "fair" : "strong";
};

export const countBands = (
  devices: ZHADevice[],
  links: LinkQualities = {}
): BandCounts => {
  const counts: BandCounts = {
    strong: 0,
    fair: 0,
    weak: 0,
    offline: 0,
    unknown: 0,
  };
  for (const device of devices) {
    counts[device.available ? signalBand(device, links) : "offline"]++;
  }
  return counts;
};

/**
 * ZHA reports "Mains" for mains-powered devices and "Battery or Unknown" for
 * everything else. The latter is shown as battery: in practice it is almost
 * always a battery device.
 */
export const powerSource = (device: ZHADevice): PowerSource | undefined => {
  if (device.power_source === "Mains") {
    return "mains";
  }
  return device.power_source?.startsWith("Battery") ? "battery" : undefined;
};

/**
 * A device that joined the network but never finished its setup: it is known
 * to the coordinator, yet has no entities at all. The device list only
 * carries entities that were added, so one whose entities are all disabled
 * would look the same; the entity registry tells the two apart.
 * `pairing_status` would say so directly, but it only travels with the
 * pairing events, not with the device list this page is built on.
 */
export const isSetupUnfinished = (
  device: ZHADevice,
  readings: Pick<DeviceReadings, "hasRegisteredEntities">
): boolean =>
  device.entities.length === 0 && !readings.hasRegisteredEntities(device);

/** When the device was last heard from, or undefined for an empty or malformed stamp. */
export const lastSeenAt = (device: ZHADevice): Date | undefined => {
  if (!device.last_seen) {
    return undefined;
  }
  const at = new Date(device.last_seen);
  return isNaN(at.getTime()) ? undefined : at;
};

/**
 * Map each end device to the router that lists it as a child, so a weak
 * device can be traced to the neighbour it depends on. Routers are left out:
 * they route over the whole mesh, so a "Child" entry between two routers says
 * nothing about a dependency. An unavailable router's table is skipped, as in
 * the network visualization: it may still list a child that has long since
 * moved to another router.
 */
export const parentByIeee = (devices: ZHADevice[]): Record<string, string> => {
  const endDevices = new Set(
    devices
      .filter((device) => device.device_type === ZHADeviceType.EndDevice)
      .map((device) => device.ieee)
  );
  const parents: Record<string, string> = {};
  for (const device of devices) {
    if (!device.available) {
      continue;
    }
    for (const neighbor of device.neighbors) {
      if (neighbor.relationship === "Child" && endDevices.has(neighbor.ieee)) {
        parents[neighbor.ieee] = device.user_given_name || device.name;
      }
    }
  }
  return parents;
};

export const findings = (
  devices: ZHADevice[],
  readings: DeviceReadings,
  links: LinkQualities = {}
): Findings => {
  // A disabled device was switched off on purpose and is not reported on.
  const active = devices.filter((device) => !readings.isDisabled(device));
  // An offline device has no current signal or battery reading, so it is
  // only listed as offline.
  const online = active.filter((device) => device.available);
  return {
    offline: active.filter((device) => !device.available),
    setup_unfinished: active.filter((device) =>
      isSetupUnfinished(device, readings)
    ),
    weak_signal: online
      .filter((device) => signalBand(device, links) === "weak")
      .sort(
        (a, b) => (linkQuality(a, links) ?? 0) - (linkQuality(b, links) ?? 0)
      ),
    low_battery: online
      .filter((device) => {
        const level = readings.batteryLevel(device);
        return level !== null && level <= LOW_BATTERY;
      })
      .sort((a, b) => readings.batteryLevel(a)! - readings.batteryLevel(b)!),
  };
};

/**
 * How many devices need attention. A device that is both offline and not set
 * up is counted once.
 */
export const attentionCount = (found: Findings): number =>
  new Set(NEEDS_ATTENTION.flatMap((key) => found[key]).map((d) => d.ieee)).size;

/**
 * Order devices by area, so devices in the same room sit together.
 * Unassigned devices come last. Within an area, devices are ordered by name,
 * or keep their incoming order (for example worst reading first) when no
 * name function is given.
 */
export const sortByArea = (
  devices: ZHADevice[],
  areaName: (device: ZHADevice) => string | undefined,
  deviceName: ((device: ZHADevice) => string) | null,
  compare: (a: string, b: string) => number = (a, b) => a.localeCompare(b)
): ZHADevice[] =>
  // Array.prototype.sort is stable, so returning 0 keeps the incoming order.
  [...devices].sort((a, b) => {
    const areaA = areaName(a);
    const areaB = areaName(b);
    if (areaA !== areaB) {
      if (areaA === undefined) return 1;
      if (areaB === undefined) return -1;
      return compare(areaA, areaB);
    }
    return deviceName ? compare(deviceName(a), deviceName(b)) : 0;
  });
