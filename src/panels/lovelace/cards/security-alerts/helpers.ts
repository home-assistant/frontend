import type { HassEntity } from "home-assistant-js-websocket";
import { mdiCctvOff, mdiLockOpen, mdiShieldAlert, mdiWater } from "@mdi/js";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { isValidEntityId } from "../../../../common/entity/valid_entity_id";
import { UNAVAILABLE, UNKNOWN } from "../../../../data/entity/entity";
import type { HomeAssistant } from "../../../../types";
import type { StateCondition } from "../../common/validate-condition";
import type { SecurityAlertsCardEntityConfig } from "../types";
import {
  checkConditionsMet,
  extractConditionEntityIds,
  validateConditionalConfig,
} from "../../common/validate-condition";

export interface SecurityAlertItem {
  entityId: string;
  stateObj: HassEntity;
  color?: string;
  pulse: boolean;
  icon?: string;
  iconPath?: string;
}

type SecurityAlertIcon = Pick<SecurityAlertItem, "icon" | "iconPath">;

export type SecurityAlertHass = Pick<
  HomeAssistant,
  "config" | "locale" | "states" | "user"
>;

const WARNING_BINARY_SENSOR_DEVICE_CLASSES = [
  "door",
  "garage_door",
  "lock",
  "opening",
  "tamper",
  "window",
] as const;

type WarningBinarySensorDeviceClass =
  (typeof WARNING_BINARY_SENSOR_DEVICE_CLASSES)[number];
const WARNING_BINARY_SENSOR_DEVICE_CLASS_SET =
  new Set<WarningBinarySensorDeviceClass>(WARNING_BINARY_SENSOR_DEVICE_CLASSES);

const isWarningBinarySensorDeviceClass = (
  deviceClass: string
): deviceClass is WarningBinarySensorDeviceClass =>
  WARNING_BINARY_SENSOR_DEVICE_CLASS_SET.has(
    deviceClass as WarningBinarySensorDeviceClass
  );

export const computeSecurityAlertEntityDefaultColor = (
  stateObj?: HassEntity
): string => {
  if (!stateObj) {
    return "red";
  }

  const domain = computeDomain(stateObj.entity_id);
  if (domain === "camera") {
    return "blue";
  }
  if (domain === "binary_sensor") {
    const deviceClass = stateObj.attributes.device_class;
    return typeof deviceClass === "string" &&
      isWarningBinarySensorDeviceClass(deviceClass)
      ? "amber"
      : "red";
  }
  if (domain === "cover" || domain === "lock") {
    return "amber";
  }
  return "red";
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
      condition.state_not = "closed";
      break;
    case "lock":
      condition.state_not = "locked";
      break;
    default:
      condition.state = "on";
  }

  return [condition];
};

export const isValidSecurityAlertEntityConfig = (
  alertEntity: unknown
): alertEntity is SecurityAlertsCardEntityConfig =>
  Boolean(
    alertEntity &&
    typeof alertEntity === "object" &&
    "entity" in alertEntity &&
    typeof alertEntity.entity === "string" &&
    isValidEntityId(alertEntity.entity) &&
    (!("color" in alertEntity) ||
      alertEntity.color === undefined ||
      typeof alertEntity.color === "string") &&
    (!("pulse" in alertEntity) ||
      alertEntity.pulse === undefined ||
      typeof alertEntity.pulse === "boolean") &&
    (!("visibility" in alertEntity) ||
      alertEntity.visibility === undefined ||
      (Array.isArray(alertEntity.visibility) &&
        alertEntity.visibility.every(
          (condition) => condition?.condition === "state"
        ) &&
        validateConditionalConfig(alertEntity.visibility)))
  );

export const extractSecurityAlertEntityIds = (
  alertEntities: SecurityAlertsCardEntityConfig[]
): string[] => [
  ...new Set(
    alertEntities.flatMap((alertEntity) => [
      alertEntity.entity,
      ...extractConditionEntityIds(
        alertEntity.visibility ??
          computeDefaultSecurityAlertVisibility(alertEntity.entity)
      ),
    ])
  ),
];

const computeSecurityAlertIcon = (stateObj: HassEntity): SecurityAlertIcon => {
  const domain = computeDomain(stateObj.entity_id);
  if (stateObj.state === UNAVAILABLE && domain === "camera") {
    return { iconPath: mdiCctvOff };
  }
  if (
    domain === "binary_sensor" &&
    stateObj.attributes.device_class === "moisture"
  ) {
    return { iconPath: mdiWater };
  }
  if (domain === "lock") {
    return { iconPath: mdiLockOpen };
  }
  if (domain === "alarm_control_panel") {
    return { iconPath: mdiShieldAlert };
  }
  return typeof stateObj.attributes.icon === "string"
    ? { icon: stateObj.attributes.icon }
    : {};
};

export const computeSecurityAlertItem = (
  stateObj: HassEntity,
  alertEntity: SecurityAlertsCardEntityConfig
): SecurityAlertItem => ({
  entityId: stateObj.entity_id,
  stateObj,
  color: alertEntity.color ?? computeSecurityAlertEntityDefaultColor(stateObj),
  pulse: alertEntity.pulse === undefined || alertEntity.pulse === true,
  ...computeSecurityAlertIcon(stateObj),
});

export const computeSecurityAlertItems = (
  hass: SecurityAlertHass,
  alertEntities: SecurityAlertsCardEntityConfig[]
): SecurityAlertItem[] =>
  alertEntities
    .map((alertEntity): SecurityAlertItem | undefined => {
      const stateObj = hass.states[alertEntity.entity];
      if (!stateObj) {
        return undefined;
      }

      const visibility =
        alertEntity.visibility ??
        computeDefaultSecurityAlertVisibility(alertEntity.entity);

      // checkConditionsMet only reads config, locale, states, and user for
      // supported condition types. Keep this helper narrowed to avoid
      // reconstructing a full HomeAssistant object from card contexts.
      if (
        !checkConditionsMet(visibility, hass as HomeAssistant, {
          entity_id: alertEntity.entity,
        })
      ) {
        return undefined;
      }

      return computeSecurityAlertItem(stateObj, alertEntity);
    })
    .filter((item): item is SecurityAlertItem => Boolean(item));
