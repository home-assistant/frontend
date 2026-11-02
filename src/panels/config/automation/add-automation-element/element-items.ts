import { html } from "lit";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../../common/translations/localize";
import "../../../../components/ha-condition-icon";
import "../../../../components/ha-service-icon";
import "../../../../components/ha-trigger-icon";
import {
  DYNAMIC_PREFIX,
  type AutomationElementGroup,
} from "../../../../data/automation";
import type { ConditionDescriptions } from "../../../../data/condition";
import {
  getConditionDomain,
  getConditionObjectId,
} from "../../../../data/condition";
import { domainToName } from "../../../../data/integration";
import type { TriggerDescriptions } from "../../../../data/trigger";
import { getTriggerDomain, getTriggerObjectId } from "../../../../data/trigger";
import type { HomeAssistant } from "../../../../types";
import { ELEMENT_TYPES } from "./constants";
import type { AddAutomationElementListItem, AddElementType } from "./types";

type GroupOptions = AutomationElementGroup[string];

export const convertToItem = (
  key: string,
  options: GroupOptions,
  type: AddElementType,
  localize: LocalizeFunc
): AddAutomationElementListItem => {
  // A group either lists explicit members or bundles backend element domains.
  const isGroup = !!(options.members || options.domains);
  return {
    key,
    name: localize(
      `ui.panel.config.automation.editor.${type}s.${
        isGroup ? "groups" : "type"
      }.${key}.label` as LocalizeKeys
    ),
    description: localize(
      `ui.panel.config.automation.editor.${type}s.${
        isGroup ? "groups" : "type"
      }.${key}.description${isGroup ? "" : ".picker"}` as LocalizeKeys
    ),
    iconPath: options.icon || ELEMENT_TYPES[type].icons[key],
  };
};

export const getTriggerListItem = (
  localize: LocalizeFunc,
  domain: string,
  trigger: string
): AddAutomationElementListItem => {
  const triggerName = getTriggerObjectId(trigger);
  return {
    icon: html` <ha-trigger-icon .trigger=${trigger}></ha-trigger-icon> `,
    key: `${DYNAMIC_PREFIX}${trigger}`,
    name:
      localize(`component.${domain}.triggers.${triggerName}.name`) || trigger,
    description:
      localize(`component.${domain}.triggers.${triggerName}.description`) ||
      trigger,
  };
};

export const getConditionListItem = (
  localize: LocalizeFunc,
  domain: string,
  condition: string
): AddAutomationElementListItem => {
  const conditionName = getConditionObjectId(condition);
  return {
    icon: html`
      <ha-condition-icon .condition=${condition}></ha-condition-icon>
    `,
    key: `${DYNAMIC_PREFIX}${condition}`,
    name:
      localize(`component.${domain}.conditions.${conditionName}.name`) ||
      condition,
    description:
      localize(`component.${domain}.conditions.${conditionName}.description`) ||
      condition,
  };
};

export const getServiceListItem = (
  localize: LocalizeFunc,
  services: HomeAssistant["services"],
  domain: string,
  service: string,
  showDomainPrefix: boolean
): AddAutomationElementListItem => {
  const serviceDef = services[domain]?.[service];
  const serviceName =
    localize(
      `component.${domain}.services.${service}.name`,
      serviceDef?.description_placeholders
    ) ||
    serviceDef?.name ||
    service;
  return {
    icon: html`
      <ha-service-icon .service=${`${domain}.${service}`}></ha-service-icon>
    `,
    key: `${DYNAMIC_PREFIX}${domain}.${service}`,
    name: showDomainPrefix
      ? `${domainToName(localize, domain)}: ${serviceName}`
      : serviceName,
    description:
      localize(
        `component.${domain}.services.${service}.description`,
        serviceDef?.description_placeholders
      ) ||
      serviceDef?.description ||
      "",
  };
};

const getDomainOfElement = (type: AddElementType, key: string): string =>
  type === "condition" ? getConditionDomain(key) : getTriggerDomain(key);

export const getDomainElementItems = (
  type: AddElementType,
  domains: string[],
  localize: LocalizeFunc,
  descriptions: TriggerDescriptions | ConditionDescriptions
): AddAutomationElementListItem[] => {
  const domainSet = new Set(domains);
  if (type === "trigger") {
    return Object.keys(descriptions)
      .filter((trigger) => domainSet.has(getTriggerDomain(trigger)))
      .map((trigger) =>
        getTriggerListItem(localize, getTriggerDomain(trigger), trigger)
      );
  }
  if (type === "condition") {
    return Object.keys(descriptions)
      .filter((condition) => domainSet.has(getConditionDomain(condition)))
      .map((condition) =>
        getConditionListItem(localize, getConditionDomain(condition), condition)
      );
  }
  return [];
};

export const groupHasItems = (
  type: AddElementType,
  options: GroupOptions,
  descriptions: TriggerDescriptions | ConditionDescriptions
): boolean => {
  if (options.members && Object.keys(options.members).length) {
    return true;
  }
  if (options.domains) {
    const domainSet = new Set(options.domains);
    return Object.keys(descriptions).some((key) =>
      domainSet.has(getDomainOfElement(type, key))
    );
  }
  // plain single-element group
  return true;
};

export const findGroupDefinition = (
  type: AddElementType,
  group: string,
  collectionIndex: number
): GroupOptions | undefined => {
  const collections = ELEMENT_TYPES[type].collections;
  return (
    collections[collectionIndex]?.groups[group] ??
    collections.find((collection) => group in collection.groups)?.groups[group]
  );
};

export const getGroups = (
  type: AddElementType,
  group?: string,
  collectionIndex?: number
): AutomationElementGroup => {
  if (group && collectionIndex !== undefined) {
    const selectedGroup = findGroupDefinition(type, group, collectionIndex);
    return selectedGroup?.members || { [group]: selectedGroup || {} };
  }

  return ELEMENT_TYPES[type].collections.reduce(
    (acc, collection) => ({ ...acc, ...collection.groups }),
    {} as AutomationElementGroup
  );
};

// Domains owned exclusively by a curated group, i.e. a group that bundles
// only domains and no static members (e.g. "sun" under the Sun group). Those
// are hidden from the generic dynamic domain grouping so they don't appear
// both standalone and inside the curated group. Domains of a mixed group
// (static members + domains, e.g. "calendar"/"schedule" under Time) are NOT
// hidden — they still surface as their own domain group as well. Mixed groups
// in the generic collection (e.g. Event) do own their domains.
export const getExclusiveDomains = (type: AddElementType): Set<string> => {
  const domains = new Set<string>();
  ELEMENT_TYPES[type].collections.forEach((collection) =>
    Object.values(collection.groups).forEach((group) => {
      if (group.domains && (!group.members || collection.generic)) {
        group.domains.forEach((domain) => domains.add(domain));
      }
    })
  );
  return domains;
};
