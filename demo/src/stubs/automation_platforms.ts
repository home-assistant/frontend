import type { HassServiceTarget } from "home-assistant-js-websocket";
import { ensureArray } from "../../../src/common/array/ensure-array";
import { computeDomain } from "../../../src/common/entity/compute_domain";
import type { ConditionDescriptions } from "../../../src/data/condition";
import type { ExtractFromTargetResult } from "../../../src/data/target";
import type { TriggerDescriptions } from "../../../src/data/trigger";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { getLabelIds } from "./label_registry";
import {
  conditionDescriptions,
  triggerDescriptions,
} from "./automation_platforms_data";

type Descriptions = TriggerDescriptions | ConditionDescriptions;

interface EntityFilter {
  integration?: string;
  domain?: string | string[];
  device_class?: string | string[];
  supported_features?: number[];
}

// Expands a target to its areas, devices and entities, like core does
const expandTarget = (hass: MockHomeAssistant, target: HassServiceTarget) => {
  // Like core, only expand the referenced IDs that exist
  const missing = {
    floors: [] as string[],
    areas: [] as string[],
    devices: [] as string[],
    labels: [] as string[],
  };
  const existing = (
    ids: string | string[] | undefined,
    known: (id: string) => boolean,
    missingIds: string[]
  ) => {
    const result: string[] = [];
    for (const id of ensureArray(ids ?? [])) {
      if (known(id)) {
        result.push(id);
      } else {
        missingIds.push(id);
      }
    }
    return result;
  };
  const knownLabelIds = getLabelIds();

  const floorIds = new Set(
    existing(target.floor_id, (id) => id in hass.floors, missing.floors)
  );
  const labelIds = existing(
    target.label_id,
    (id) => knownLabelIds.includes(id),
    missing.labels
  );
  const hasLabel = (labels?: string[]) =>
    labelIds.some((labelId) => labels?.includes(labelId));

  const areaIds = new Set(
    existing(target.area_id, (id) => id in hass.areas, missing.areas)
  );
  for (const area of Object.values(hass.areas)) {
    if (
      (area.floor_id && floorIds.has(area.floor_id)) ||
      hasLabel(area.labels)
    ) {
      areaIds.add(area.area_id);
    }
  }

  // Like core, a child device without its own area is in the area of its
  // parent device
  const deviceArea = (deviceId: string) => {
    const device = hass.devices[deviceId];
    return (
      device?.area_id ??
      (device?.parent_device_id
        ? hass.devices[device.parent_device_id]?.area_id
        : undefined)
    );
  };

  const deviceIds = new Set(
    existing(target.device_id, (id) => id in hass.devices, missing.devices)
  );
  for (const device of Object.values(hass.devices)) {
    const areaId = deviceArea(device.id);
    if ((areaId && areaIds.has(areaId)) || hasLabel(device.labels)) {
      deviceIds.add(device.id);
    }
  }

  const entityIds = new Set(ensureArray(target.entity_id ?? []));
  for (const entity of Object.values(hass.entities)) {
    // The display registry keeps the entities of a previous demo
    if (!(entity.entity_id in hass.states)) {
      continue;
    }
    // An entity is in the area of its device, unless it has its own area
    const areaId =
      entity.area_id ??
      (entity.device_id ? deviceArea(entity.device_id) : undefined);
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
    missing,
  };
};

const targetEntities = (hass: MockHomeAssistant, target: HassServiceTarget) =>
  expandTarget(hass, target).entities;

const matchesFilter = (
  hass: MockHomeAssistant,
  entityId: string,
  filter: EntityFilter
) =>
  (!filter.integration ||
    hass.entities[entityId]?.platform === filter.integration) &&
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

type TargetDescriptions = Record<
  string,
  { target?: { entity?: EntityFilter | EntityFilter[] } | null }
>;

// Like core, the components with a target that apply to at least one entity
// of the target. A target without entity filters applies to any entity.
const componentsForTarget = (
  hass: MockHomeAssistant,
  target: HassServiceTarget,
  descriptions: TargetDescriptions
) => {
  const entityIds = targetEntities(hass, target);
  return Object.entries(descriptions)
    .filter(([, description]) => {
      if (!description.target) {
        return false;
      }
      const filters = ensureArray(description.target.entity ?? []);
      return entityIds.some(
        (entityId) =>
          !filters.length ||
          filters.some((filter) => matchesFilter(hass, entityId, filter))
      );
    })
    .map(([key]) => key);
};

const mockForTarget = (
  hass: MockHomeAssistant,
  type: string,
  descriptions: Descriptions
) =>
  hass.mockWS(
    type,
    (msg: { target: HassServiceTarget }, currentHass: MockHomeAssistant) =>
      componentsForTarget(
        currentHass,
        msg.target,
        descriptions as TargetDescriptions
      )
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
      const { areas, devices, entities, missing } = expandTarget(
        currentHass,
        msg.target
      );
      return {
        missing_areas: missing.areas,
        missing_devices: missing.devices,
        missing_floors: missing.floors,
        missing_labels: missing.labels,
        referenced_areas: areas,
        referenced_devices: devices,
        referenced_entities: entities,
      };
    }
  );
  hass.mockWS(
    "get_services_for_target",
    (msg: { target: HassServiceTarget }, currentHass: MockHomeAssistant) =>
      componentsForTarget(
        currentHass,
        msg.target,
        // Keyed by <domain>.<service>, like the triggers and conditions
        Object.fromEntries(
          Object.entries(currentHass.services).flatMap(([domain, services]) =>
            Object.entries(services).map(([service, description]) => [
              `${domain}.${service}`,
              description,
            ])
          )
        ) as TargetDescriptions
      )
  );
};
