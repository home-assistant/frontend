import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type { Cluster, ZHADevice, ZHAGroup } from "../../../../../data/zha";
import { ZHADeviceType } from "../../../../../data/zha";

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
