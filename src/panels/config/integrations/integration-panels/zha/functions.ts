import type { LocalizeFunc } from "../../../../../common/translations/localize";
import { computeAreaName } from "../../../../../common/entity/compute_area_name";
import { getDeviceArea } from "../../../../../common/entity/context/get_device_context";
import type { Cluster, ZHADevice, ZHAGroup } from "../../../../../data/zha";
import { ZHADeviceType } from "../../../../../data/zha";
import type { HomeAssistant } from "../../../../../types";

export const getZHADeviceAreaName = (
  device: ZHADevice,
  areas: HomeAssistant["areas"],
  devices: HomeAssistant["devices"]
): string | undefined => {
  // The device registry is authoritative: an entry with no effective
  // area means the device has no area, even if ZHA still reports one
  // from its cached response. Resolve via the registry so a child
  // device inherits its parent's area, matching the ZHA network
  // visualization.
  const haDevice = devices[device.device_reg_id];
  if (haDevice) {
    const area = getDeviceArea(haDevice, areas, devices);
    return area ? computeAreaName(area) : undefined;
  }
  // Fall back to the area reported by ZHA itself, only when the device
  // has no registry entry at all.
  if (!device.area_id) {
    return undefined;
  }
  const areaEntry = areas[device.area_id];
  return areaEntry ? computeAreaName(areaEntry) : undefined;
};

export const formatAsPaddedHex = (value: string | number): string => {
  let hex = value;
  if (typeof value === "string") {
    hex = parseInt(value, 16);
  }
  return "0x" + hex.toString(16).padStart(4, "0");
};

export const getIeeeTail = (ieee: string) =>
  ieee.split(":").slice(-4).reverse().join("");

// Only SrcID-addressed Green Power devices have a source ID, others use the IEEE
export const formatGreenPowerSrcId = (device: ZHADevice): string | undefined =>
  device.signature.src_id == null
    ? undefined
    : "0x" +
      device.signature.src_id.toString(16).toUpperCase().padStart(8, "0");

const DEVICE_TYPE_TRANSLATION_KEYS = {
  [ZHADeviceType.Coordinator]: "ui.panel.config.zha.visualization.coordinator",
  [ZHADeviceType.Router]: "ui.panel.config.zha.visualization.router",
  [ZHADeviceType.EndDevice]: "ui.panel.config.zha.visualization.end_device",
  [ZHADeviceType.GreenPower]: "ui.panel.config.zha.visualization.green_power",
  [ZHADeviceType.Unknown]: "ui.dialogs.zha_device_info.unknown",
} as const;

export const computeZHADeviceType = (
  device: ZHADevice,
  localize: LocalizeFunc
): string => {
  const key = DEVICE_TYPE_TRANSLATION_KEYS[device.device_type];
  return key ? localize(key) : device.device_type;
};

export const sortZHADevices = (a: ZHADevice, b: ZHADevice): number => {
  const nameA = a.user_given_name ? a.user_given_name : a.name;
  const nameb = b.user_given_name ? b.user_given_name : b.name;
  return nameA.localeCompare(nameb);
};

export const sortZHAGroups = (a: ZHAGroup, b: ZHAGroup): number => {
  const nameA = a.name;
  const nameb = b.name;
  return nameA.localeCompare(nameb);
};

export const computeClusterKey = (cluster: Cluster): string =>
  `${cluster.name} (Endpoint id: ${
    cluster.endpoint_id
  }, Id: ${formatAsPaddedHex(cluster.id)}, Type: ${cluster.type})`;

export const computeClusterSecondary = (
  cluster: Cluster,
  localize: LocalizeFunc
): string =>
  localize("ui.panel.config.zha.clusters.cluster_description", {
    endpoint: cluster.endpoint_id,
    id: formatAsPaddedHex(cluster.id),
    type: cluster.type,
  });

export const computeClusterValue = (cluster: Cluster): string =>
  `${cluster.endpoint_id}-${cluster.id}-${cluster.type}`;
