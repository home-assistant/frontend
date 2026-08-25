import type { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "../../../common/entity/compute_domain";
import type {
  SecurityAlertEntityConfig,
  SecurityAlertSeverity,
} from "../../../data/frontend";
import { UNAVAILABLE, UNKNOWN } from "../../../data/entity/entity";
import type { StateCondition } from "../../lovelace/common/validate-condition";
import type { AlertCardConfig } from "../../lovelace/cards/types";

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

export const computeDefaultSecurityAlertVisibility = (
  entityId: string
): StateCondition[] => {
  const condition: StateCondition = {
    condition: "state",
    entity: entityId,
  };

  switch (computeDomain(entityId)) {
    case "alarm_control_panel":
      condition.state = "triggered";
      break;
    case "camera":
      condition.state = [UNAVAILABLE, UNKNOWN];
      break;
    case "cover":
      condition.state = ["open", "opening", "closing"];
      break;
    case "lock":
      condition.state = [
        "jammed",
        "unlocked",
        "open",
      ];
      break;
    default:
      condition.state = "on";
  }

  return [condition];
};

export const computeSecurityAlertCardConfig = (
  stateObj: HassEntity | undefined,
  alertEntity: SecurityAlertEntityConfig
): AlertCardConfig => {
  const severity =
    alertEntity.severity ?? computeDefaultSecurityAlertSeverity(stateObj);
  return {
    type: "alert",
    entity: alertEntity.entity,
    color: severity === "alert" ? "red" : "amber",
    pulse: severity === "alert",
    visibility: computeDefaultSecurityAlertVisibility(alertEntity.entity),
  };
};
