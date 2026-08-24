import type { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "../../../common/entity/compute_domain";
import type {
  SecurityAlertEntityConfig,
  SecurityAlertSeverity,
} from "../../../data/frontend";
import type { SecurityAlertsCardEntityConfig } from "../../lovelace/cards/types";

const DANGER_BINARY_SENSOR_DEVICE_CLASSES = [
  "carbon_monoxide",
  "gas",
  "moisture",
  "safety",
  "smoke",
] as const;

type DangerBinarySensorDeviceClass =
  (typeof DANGER_BINARY_SENSOR_DEVICE_CLASSES)[number];

const DANGER_BINARY_SENSOR_DEVICE_CLASS_SET =
  new Set<DangerBinarySensorDeviceClass>(DANGER_BINARY_SENSOR_DEVICE_CLASSES);

const isDangerBinarySensorDeviceClass = (
  deviceClass: string
): deviceClass is DangerBinarySensorDeviceClass =>
  DANGER_BINARY_SENSOR_DEVICE_CLASS_SET.has(
    deviceClass as DangerBinarySensorDeviceClass
  );

export const computeDefaultSecurityAlertSeverity = (
  stateObj?: HassEntity
): SecurityAlertSeverity => {
  if (!stateObj) {
    return "warning";
  }

  const domain = computeDomain(stateObj.entity_id);
  if (domain === "alarm_control_panel") {
    return "alert";
  }
  if (domain === "binary_sensor") {
    const deviceClass = stateObj.attributes.device_class;
    return typeof deviceClass === "string" &&
      isDangerBinarySensorDeviceClass(deviceClass)
      ? "alert"
      : "warning";
  }
  return "warning";
};

export const computeSecurityAlertCardEntityConfig = (
  stateObj: HassEntity | undefined,
  alertEntity: SecurityAlertEntityConfig
): SecurityAlertsCardEntityConfig => {
  const severity =
    alertEntity.severity ?? computeDefaultSecurityAlertSeverity(stateObj);
  return {
    entity: alertEntity.entity,
    color: severity === "alert" ? "red" : "amber",
  };
};
