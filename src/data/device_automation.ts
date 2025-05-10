import { computeStateName } from "../common/entity/compute_state_name";
import type { HaFormSchema } from "../components/ha-form/types";
import type { HomeAssistant } from "../types";
import type { BaseTrigger } from "./automation";
import { migrateAutomationTrigger } from "./automation";
import type { EntityRegistryEntry } from "./entity_registry";
import {
  computeEntityRegistryName,
  entityRegistryByEntityId,
  entityRegistryById,
} from "./entity_registry";

export interface DeviceAutomation {
  alias?: string;
  device_id: string;
  domain: string;
  entity_id?: string;
  type?: string;
  subtype?: string;
  event?: string;
  enabled?: boolean;
  metadata?: { secondary: boolean };
}

export interface DeviceAction extends DeviceAutomation {
  entity_id: string;
}

export interface DeviceCondition extends DeviceAutomation {
  condition: "device";
}

export type DeviceTrigger = DeviceAutomation &
  BaseTrigger & {
    trigger: "device";
  };

export interface DeviceCapabilities {
  extra_fields: HaFormSchema[];
}

export const fetchDeviceActions = (hass: HomeAssistant, deviceId: string) =>
  hass.callWS<DeviceAction[]>({
    type: "device_automation/action/list",
    device_id: deviceId,
  });

export const fetchDeviceConditions = (hass: HomeAssistant, deviceId: string) =>
  hass.callWS<DeviceCondition[]>({
    type: "device_automation/condition/list",
    device_id: deviceId,
  });

export const fetchDeviceTriggers = (hass: HomeAssistant, deviceId: string) =>
  hass
    .callWS<DeviceTrigger[]>({
      type: "device_automation/trigger/list",
      device_id: deviceId,
    })
    .then((triggers) => migrateAutomationTrigger(triggers) as DeviceTrigger[]);

export const fetchDeviceActionCapabilities = (
  hass: HomeAssistant,
  action: DeviceAction
) =>
  hass.callWS<DeviceCapabilities>({
    type: "device_automation/action/capabilities",
    action,
  });

export const fetchDeviceConditionCapabilities = (
  hass: HomeAssistant,
  condition: DeviceCondition
) =>
  hass.callWS<DeviceCapabilities>({
    type: "device_automation/condition/capabilities",
    condition,
  });

export const fetchDeviceTriggerCapabilities = (
  hass: HomeAssistant,
  trigger: DeviceTrigger
) =>
  hass.callWS<DeviceCapabilities>({
    type: "device_automation/trigger/capabilities",
    trigger,
  });

const deviceAutomationIdentifiers = [
  "device_id",
  "domain",
  "entity_id",
  "type",
  "subtype",
  "event",
  "condition",
  "trigger",
];

export const deviceAutomationsEqual = (
  entityRegistry: EntityRegistryEntry[],
  a: DeviceAutomation,
  b: DeviceAutomation
) => {
  if (typeof a !== typeof b) {
    return false;
  }

  for (const property in a) {
    if (!deviceAutomationIdentifiers.includes(property)) {
      continue;
    }
    if (
      property === "entity_id" &&
      a[property]?.includes(".") !== b[property]?.includes(".")
    ) {
      // both entity_id and entity_reg_id could be used, we should compare the entity_reg_id
      if (
        !compareEntityIdWithEntityRegId(
          entityRegistry,
          a[property],
          b[property]
        )
      ) {
        return false;
      }
      continue;
    }
    if (!Object.is(a[property], b[property])) {
      return false;
    }
  }
  for (const property in b) {
    if (!deviceAutomationIdentifiers.includes(property)) {
      continue;
    }
    if (
      property === "entity_id" &&
      a[property]?.includes(".") !== b[property]?.includes(".")
    ) {
      // both entity_id and entity_reg_id could be used, we should compare the entity_reg_id
      if (
        !compareEntityIdWithEntityRegId(
          entityRegistry,
          a[property],
          b[property]
        )
      ) {
        return false;
      }
      continue;
    }
    if (!Object.is(a[property], b[property])) {
      return false;
    }
  }

  return true;
};

const compareEntityIdWithEntityRegId = (
  entityRegistry: EntityRegistryEntry[],
  entityIdA?: string,
  entityIdB?: string
) => {
  if (!entityIdA || !entityIdB) {
    return false;
  }
  if (entityIdA.includes(".")) {
    const entityA = entityRegistryByEntityId(entityRegistry)[entityIdA];
    if (!entityA) {
      return false;
    }
    entityIdA = entityA.id;
  }
  if (entityIdB.includes(".")) {
    const entityB = entityRegistryByEntityId(entityRegistry)[entityIdB];
    if (!entityB) {
      return false;
    }
    entityIdB = entityB.id;
  }
  return entityIdA === entityIdB;
};

const getEntityName = (
  hass: HomeAssistant,
  entityRegistry: EntityRegistryEntry[],
  entityId: string | undefined
): string => {
  if (!entityId) {
    return (
      "<" +
      hass.localize("ui.panel.config.automation.editor.unknown_entity") +
      ">"
    );
  }
  if (entityId.includes(".")) {
    const state = hass.states[entityId];
    if (state) {
      return computeStateName(state);
    }
    return entityId;
  }
  const entityReg = entityRegistryById(entityRegistry)[entityId];
  if (entityReg) {
    return computeEntityRegistryName(hass, entityReg) || entityId;
  }
  return (
    "<" +
    hass.localize("ui.panel.config.automation.editor.unknown_entity") +
    ">"
  );
};

export const localizeDeviceAutomationAction = (
  hass: HomeAssistant,
  entityRegistry: EntityRegistryEntry[],
  action: DeviceAction
): string =>
  hass.localize(
    `component.${action.domain}.device_automation.action_type.${action.type}`,
    {
      entity_name: getEntityName(hass, entityRegistry, action.entity_id),
      subtype: action.subtype
        ? hass.localize(
            `component.${action.domain}.device_automation.action_subtype.${action.subtype}`
          ) || action.subtype
        : "",
    }
  ) || (action.subtype ? `"${action.subtype}" ${action.type}` : action.type!);

export const localizeDeviceAutomationCondition = (
  hass: HomeAssistant,
  entityRegistry: EntityRegistryEntry[],
  condition: DeviceCondition
): string =>
  hass.localize(
    `component.${condition.domain}.device_automation.condition_type.${condition.type}`,
    {
      entity_name: getEntityName(hass, entityRegistry, condition.entity_id),
      subtype: condition.subtype
        ? hass.localize(
            `component.${condition.domain}.device_automation.condition_subtype.${condition.subtype}`
          ) || condition.subtype
        : "",
    }
  ) ||
  (condition.subtype
    ? `"${condition.subtype}" ${condition.type}`
    : condition.type!);

export const localizeDeviceAutomationTrigger = (
  hass: HomeAssistant,
  entityRegistry: EntityRegistryEntry[],
  trigger: DeviceTrigger
): string =>
  hass.localize(
    `component.${trigger.domain}.device_automation.trigger_type.${trigger.type}`,
    {
      entity_name: getEntityName(hass, entityRegistry, trigger.entity_id),
      subtype: trigger.subtype
        ? hass.localize(
            `component.${trigger.domain}.device_automation.trigger_subtype.${trigger.subtype}`
          ) || trigger.subtype
        : "",
    }
  ) ||
  (trigger.subtype ? `"${trigger.subtype}" ${trigger.type}` : trigger.type!);

export const localizeExtraFieldsComputeLabelCallback =
  (hass: HomeAssistant, deviceAutomation: DeviceAutomation) =>
  // Returns a callback for ha-form to calculate labels per schema object
  (schema): string =>
    hass.localize(
      `component.${deviceAutomation.domain}.device_automation.extra_fields.${schema.name}`
    ) || schema.name;

export const localizeExtraFieldsComputeHelperCallback =
  (hass: HomeAssistant, deviceAutomation: DeviceAutomation) =>
  // Returns a callback for ha-form to calculate helper texts per schema object
  (schema): string | undefined =>
    hass.localize(
      `component.${deviceAutomation.domain}.device_automation.extra_fields_descriptions.${schema.name}`
    );

export const sortDeviceAutomations = (
  automationA: DeviceAutomation,
  automationB: DeviceAutomation
) => {
  if (automationA.metadata?.secondary && !automationB.metadata?.secondary) {
    return 1;
  }
  if (!automationA.metadata?.secondary && automationB.metadata?.secondary) {
    return -1;
  }
  return 0;
};
