import { ASSIST_ENTITIES, SENSOR_ENTITIES } from "../../common/const";
import { computeDomain } from "../../common/entity/compute_domain";
import type { EntityCategory } from "../entity/entity_registry";

export const DEVICE_ENTITY_CATEGORIES = [
  "control",
  "sensor",
  "notify",
  "event",
  "assist",
  "config",
  "diagnostic",
] as const;

export type DeviceEntityCategory = (typeof DEVICE_ENTITY_CATEGORIES)[number];

export const computeDeviceEntityCategory = (entry: {
  entity_id: string;
  entity_category?: EntityCategory | null;
}): DeviceEntityCategory => {
  const domain = computeDomain(entry.entity_id);

  if (ASSIST_ENTITIES.includes(domain)) {
    return "assist";
  }

  if (domain === "event" || domain === "notify") {
    return domain;
  }

  if (entry.entity_category) {
    return entry.entity_category;
  }

  if (SENSOR_ENTITIES.includes(domain)) {
    return "sensor";
  }

  return "control";
};
