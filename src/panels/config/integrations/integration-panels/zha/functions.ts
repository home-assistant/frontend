import { Cluster, ZHADevice, ZHAGroup } from "../../../../../data/zha";

export const formatAsPaddedHex = (value: string | number): string => {
  let hex = value;
  if (typeof value === "string") {
    hex = parseInt(value, 16);
  }
  return "0x" + hex.toString(16).padStart(4, "0");
};

export const getIeeeTail = (ieee: string) =>
  ieee.split(":").slice(-4).reverse().join("");

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
