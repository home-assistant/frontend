import type { HassServiceTarget } from "home-assistant-js-websocket";
import { ensureArray } from "../../../src/common/array/ensure-array";
import { computeDomain } from "../../../src/common/entity/compute_domain";
import type { ConditionDescriptions } from "../../../src/data/condition";
import type { ExtractFromTargetResult } from "../../../src/data/target";
import type { TriggerDescriptions } from "../../../src/data/trigger";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import {
  conditionDescriptions,
  triggerDescriptions,
} from "./automation_platforms_data";

type Descriptions = TriggerDescriptions | ConditionDescriptions;

interface EntityFilter {
  domain?: string | string[];
  device_class?: string | string[];
  supported_features?: number[];
}

// Expands a target to its areas, devices and entities, like core does
const expandTarget = (hass: MockHomeAssistant, target: HassServiceTarget) => {
  const floorIds = new Set(ensureArray(target.floor_id ?? []));
  const labelIds = ensureArray(target.label_id ?? []);
  const hasLabel = (labels?: string[]) =>
    labelIds.some((labelId) => labels?.includes(labelId));

  const areaIds = new Set(ensureArray(target.area_id ?? []));
  for (const area of Object.values(hass.areas)) {
    if (
      (area.floor_id && floorIds.has(area.floor_id)) ||
      hasLabel(area.labels)
    ) {
      areaIds.add(area.area_id);
    }
  }

  const deviceIds = new Set(ensureArray(target.device_id ?? []));
  for (const device of Object.values(hass.devices)) {
    if (
      (device.area_id && areaIds.has(device.area_id)) ||
      hasLabel(device.labels)
    ) {
      deviceIds.add(device.id);
    }
  }

  const entityIds = new Set(ensureArray(target.entity_id ?? []));
  for (const entity of Object.values(hass.entities)) {
    // An entity is in the area of its device, unless it has its own area
    const areaId =
      entity.area_id ??
      (entity.device_id ? hass.devices[entity.device_id]?.area_id : undefined);
    if (
      (entity.device_id && deviceIds.has(entity.device_id)) ||
      (areaId && areaIds.has(areaId)) ||
      hasLabel(entity.labels)
    ) {
      entityIds.add(entity.entity_id);
    }
  }

  return {
    areas: [...areaIds],
    devices: [...deviceIds],
    entities: [...entityIds],
  };
};

const targetEntities = (hass: MockHomeAssistant, target: HassServiceTarget) =>
  expandTarget(hass, target).entities;

const matchesFilter = (
  hass: MockHomeAssistant,
  entityId: string,
  filter: EntityFilter
) =>
  (!filter.domain ||
    ensureArray(filter.domain).includes(computeDomain(entityId))) &&
  (!filter.device_class ||
    ensureArray(filter.device_class).includes(
      hass.states[entityId]?.attributes.device_class ?? ""
    )) &&
  // Like core, the entity needs all the features of one of the feature sets
  (!filter.supported_features ||
    filter.supported_features.some(
      (features) =>
        // eslint-disable-next-line no-bitwise
        ((hass.states[entityId]?.attributes.supported_features ?? 0) &
          features) ===
        features
    ));

// The triggers or conditions that apply to at least one entity of the target
const mockForTarget = (
  hass: MockHomeAssistant,
  type: string,
  descriptions: Descriptions
) =>
  hass.mockWS(
    type,
    (msg: { target: HassServiceTarget }, currentHass: MockHomeAssistant) => {
      const entityIds = targetEntities(currentHass, msg.target);
      return Object.entries(descriptions)
        .filter(([, description]) => {
          const filters = description.target?.entity;
          return (
            filters &&
            entityIds.some((entityId) =>
              ensureArray(filters as EntityFilter | EntityFilter[]).some(
                (filter) => matchesFilter(currentHass, entityId, filter)
              )
            )
          );
        })
        .map(([key]) => key);
    }
  );

const mockPlatformSubscription = (
  hass: MockHomeAssistant,
  type: string,
  descriptions: Descriptions
) =>
  hass.mockWS(
    type,
    (_msg, _hass, onChange?: (descriptions: Descriptions) => void) => {
      onChange?.(descriptions);
      return () => undefined;
    }
  );

export const mockAutomationPlatforms = (hass: MockHomeAssistant) => {
  mockPlatformSubscription(
    hass,
    "trigger_platforms/subscribe",
    triggerDescriptions
  );
  mockPlatformSubscription(
    hass,
    "condition_platforms/subscribe",
    conditionDescriptions
  );
  mockForTarget(hass, "get_triggers_for_target", triggerDescriptions);
  mockForTarget(hass, "get_conditions_for_target", conditionDescriptions);
  hass.mockWS(
    "extract_from_target",
    (
      msg: { target: HassServiceTarget },
      currentHass: MockHomeAssistant
    ): ExtractFromTargetResult => {
      const { areas, devices, entities } = expandTarget(
        currentHass,
        msg.target
      );
      return {
        missing_areas: [],
        missing_devices: [],
        missing_floors: [],
        missing_labels: [],
        referenced_areas: areas,
        referenced_devices: devices,
        referenced_entities: entities,
      };
    }
  );
  hass.mockWS(
    "get_services_for_target",
    (msg: { target: HassServiceTarget }, currentHass: MockHomeAssistant) => {
      const domains = new Set(
        targetEntities(currentHass, msg.target).map(computeDomain)
      );
      return [...domains].flatMap((domain) =>
        Object.keys(currentHass.services[domain] ?? {}).map(
          (service) => `${domain}.${service}`
        )
      );
    }
  );
};
