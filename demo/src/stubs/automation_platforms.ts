import type { HassServiceTarget } from "home-assistant-js-websocket";
import { ensureArray } from "../../../src/common/array/ensure-array";
import { computeDomain } from "../../../src/common/entity/compute_domain";
import type { ConditionDescriptions } from "../../../src/data/condition";
import type { TriggerDescriptions } from "../../../src/data/trigger";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import {
  conditionDescriptions,
  triggerDescriptions,
} from "./automation_platforms_data";
import { explainTarget } from "./explain_target";
import { expandTarget, mockExtractFromTarget } from "./target";

type Descriptions = TriggerDescriptions | ConditionDescriptions;

interface EntityFilter {
  integration?: string;
  domain?: string | string[];
  device_class?: string | string[];
  supported_features?: number[];
}

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
  {
    target?: {
      entity?: EntityFilter | EntityFilter[];
      primary_entities_only?: boolean;
    } | null;
  }
>;

// Like core, the components with a target that apply to at least one entity
// of the target. A target without entity filters applies to any entity.
const componentsForTarget = (
  hass: MockHomeAssistant,
  target: HassServiceTarget,
  descriptions: TargetDescriptions
) => {
  const entityIds = expandTarget(hass, target, false).entities;
  const targetedIds = ensureArray(target.entity_id ?? []);
  return Object.entries(descriptions)
    .filter(([, description]) => {
      if (!description.target) {
        return false;
      }
      const filters = ensureArray(description.target.entity ?? []);
      const primaryEntitiesOnly =
        description.target.primary_entities_only ?? true;
      return entityIds.some(
        (entityId) =>
          // Entities with a category only count when targeted directly,
          // unless the component allows them
          (!primaryEntitiesOnly ||
            targetedIds.includes(entityId) ||
            !hass.entities[entityId]?.entity_category) &&
          (!filters.length ||
            filters.some((filter) => matchesFilter(hass, entityId, filter)))
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
  mockExtractFromTarget(hass);
  hass.mockWS(
    "explain_target",
    (
      msg: { target: HassServiceTarget; primary_entities_only?: boolean },
      currentHass: MockHomeAssistant
    ) =>
      explainTarget(
        msg.target,
        (target, primaryEntitiesOnly) =>
          expandTarget(currentHass, target, primaryEntitiesOnly),
        Object.keys(currentHass.states),
        msg.primary_entities_only ?? true
      )
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
