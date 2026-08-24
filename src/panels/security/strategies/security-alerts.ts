import type { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "../../../common/entity/compute_domain";
import type {
  SecurityAlertEntityConfig,
  SecurityAlertSeverity,
} from "../../../data/frontend";
import { computeDefaultSecurityAlertVisibility } from "../../lovelace/cards/security-alerts/helpers";
import type { SecurityAlertsCardEntityConfig } from "../../lovelace/cards/types";

const DANGER_BINARY_SENSOR_DEVICE_CLASSES = [
  "carbon_monoxide",
  "gas",
  "moisture",
  "safety",
  "smoke",
] as const;

const WARNING_BINARY_SENSOR_DEVICE_CLASSES = [
  "door",
  "garage_door",
  "lock",
  "opening",
  "tamper",
  "window",
] as const;

const WARNING_COVER_DEVICE_CLASSES = [
  "door",
  "garage",
  "gate",
  "window",
] as const;

type DangerBinarySensorDeviceClass =
  (typeof DANGER_BINARY_SENSOR_DEVICE_CLASSES)[number];
type WarningBinarySensorDeviceClass =
  (typeof WARNING_BINARY_SENSOR_DEVICE_CLASSES)[number];
type WarningCoverDeviceClass = (typeof WARNING_COVER_DEVICE_CLASSES)[number];

const DANGER_BINARY_SENSOR_DEVICE_CLASS_SET =
  new Set<DangerBinarySensorDeviceClass>(DANGER_BINARY_SENSOR_DEVICE_CLASSES);
const WARNING_BINARY_SENSOR_DEVICE_CLASS_SET =
  new Set<WarningBinarySensorDeviceClass>(WARNING_BINARY_SENSOR_DEVICE_CLASSES);
const WARNING_COVER_DEVICE_CLASS_SET = new Set<WarningCoverDeviceClass>(
  WARNING_COVER_DEVICE_CLASSES
);

const isDangerBinarySensorDeviceClass = (
  deviceClass: string
): deviceClass is DangerBinarySensorDeviceClass =>
  DANGER_BINARY_SENSOR_DEVICE_CLASS_SET.has(
    deviceClass as DangerBinarySensorDeviceClass
  );

const isWarningBinarySensorDeviceClass = (
  deviceClass: string
): deviceClass is WarningBinarySensorDeviceClass =>
  WARNING_BINARY_SENSOR_DEVICE_CLASS_SET.has(
    deviceClass as WarningBinarySensorDeviceClass
  );

const isWarningCoverDeviceClass = (
  deviceClass: string
): deviceClass is WarningCoverDeviceClass =>
  WARNING_COVER_DEVICE_CLASS_SET.has(deviceClass as WarningCoverDeviceClass);

export const isSecurityAlertEntity = (stateObj: HassEntity): boolean => {
  const domain = computeDomain(stateObj.entity_id);

  switch (domain) {
    case "alarm_control_panel":
    case "camera":
    case "lock":
      return true;
    case "binary_sensor": {
      const deviceClass = stateObj.attributes.device_class;
      return (
        typeof deviceClass === "string" &&
        (isDangerBinarySensorDeviceClass(deviceClass) ||
          isWarningBinarySensorDeviceClass(deviceClass))
      );
    }
    case "cover": {
      const deviceClass = stateObj.attributes.device_class;
      return (
        typeof deviceClass === "string" &&
        isWarningCoverDeviceClass(deviceClass)
      );
    }
    default:
      return false;
  }
};

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
    pulse: true,
    visibility: computeDefaultSecurityAlertVisibility(alertEntity.entity),
  };
};
