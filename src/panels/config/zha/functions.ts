import { ZHADevice, ZHAGroup } from "../../../data/zha";

export const formatAsPaddedHex = (value: string | number): string => {
  let hex = value;
  if (typeof value === "string") {
    hex = parseInt(value, 16);
  }
  return "0x" + hex.toString(16).padStart(4, "0");
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
