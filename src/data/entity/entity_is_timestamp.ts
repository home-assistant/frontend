import { TIMESTAMP_STATE_DOMAINS } from "../../common/const";
import { computeDomain } from "../../common/entity/compute_domain";
import type { HomeAssistant } from "../../types";
import { SENSOR_TIMESTAMP_DEVICE_CLASSES } from "../sensor";

export const entityIsTimestamp = (
  entityId: string,
  states: HomeAssistant["states"]
): boolean => {
  const domain = computeDomain(entityId);

  return (
    TIMESTAMP_STATE_DOMAINS.has(domain) ||
    (domain === "sensor" &&
      SENSOR_TIMESTAMP_DEVICE_CLASSES.includes(
        states[entityId]?.attributes.device_class || ""
      ))
  );
};
