import { stringCompare } from "../../../../common/string/compare";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import {
  DYNAMIC_PREFIX,
  getValueFromDynamic,
  isDynamic,
  type AutomationElementGroup,
} from "../../../../data/automation";
import { getConditionDomain } from "../../../../data/condition";
import { getTriggerDomain } from "../../../../data/trigger";
import {
  BUILDING_BLOCKS,
  DYNAMIC_KEYWORDS,
  ELEMENT_TYPES,
  MAX_RECENT_ELEMENTS,
  TIME_LOCATION_GROUPS,
} from "./constants";
import { getDynamicDomainGroups } from "./domain-classification";
import { findElementGroupKey } from "./element-group";
import {
  convertToItem,
  findGroupDefinition,
  getConditionListItem,
  getDomainElementItems,
  getExclusiveDomains,
  getGroups,
  getServiceListItem,
  getTriggerListItem,
  groupHasItems,
} from "./element-items";
import type {
  AddAutomationElementListItem,
  AddElementType,
  CollectionGroup,
  CollectionGroupType,
  ElementSources,
  RecentElement,
} from "./types";

const sortByName = (
  items: AddAutomationElementListItem[],
  language: string
): AddAutomationElementListItem[] =>
  items.sort((a, b) => stringCompare(a.name, b.name, language));

const getDescriptions = (sources: ElementSources) =>
  sources.type === "condition"
    ? sources.conditionDescriptions
    : sources.triggerDescriptions;

export const getTriggerItems = (
  sources: ElementSources,
  systemDomainsByEntityDomain: Map<string, Set<string>> | undefined,
  group?: string
): AddAutomationElementListItem[] => {
  const { localize, language, triggerDescriptions } = sources;
  if (!triggerDescriptions) {
    return [];
  }

  const browsedEntityDomain =
    group && isDynamic(group) ? getValueFromDynamic(group) : undefined;

  // System domains that should be merged into this entity domain group
  const systemDomainsForGroup = browsedEntityDomain
    ? systemDomainsByEntityDomain?.get(browsedEntityDomain)
    : undefined;

  return sortByName(
    Object.keys(triggerDescriptions)
      .filter((trigger) => {
        const domain = getTriggerDomain(trigger);
        if (!group || group === `${DYNAMIC_PREFIX}${domain}`) {
          return true;
        }
        return systemDomainsForGroup?.has(domain) ?? false;
      })
      .map((trigger) =>
        getTriggerListItem(localize, getTriggerDomain(trigger), trigger)
      ),
    language
  );
};

export const getConditionItems = (
  sources: ElementSources,
  systemDomainsByEntityDomain: Map<string, Set<string>> | undefined,
  group?: string
): AddAutomationElementListItem[] => {
  const { localize, conditionDescriptions } = sources;
  if (!conditionDescriptions) {
    return [];
  }

  const browsedEntityDomain =
    group && isDynamic(group) ? getValueFromDynamic(group) : undefined;

  const systemDomainsForGroup = browsedEntityDomain
    ? systemDomainsByEntityDomain?.get(browsedEntityDomain)
    : undefined;

  const result: AddAutomationElementListItem[] = [];
  for (const condition of Object.keys(conditionDescriptions)) {
    const domain = getConditionDomain(condition);

    if (
      group &&
      group !== `${DYNAMIC_PREFIX}${domain}` &&
      !(systemDomainsForGroup?.has(domain) ?? false)
    ) {
      continue;
    }

    result.push(getConditionListItem(localize, domain, condition));
  }
  return result;
};

export const getServiceItems = (
  sources: ElementSources,
  group?: string
): AddAutomationElementListItem[] => {
  const { localize, language, services, manifests } = sources;
  if (!services) {
    return [];
  }
  const result: AddAutomationElementListItem[] = [];

  const addDomain = (domain: string) => {
    const manifest = manifests?.[domain];
    // Built-in entity domains are known well enough without a prefix
    const showDomainPrefix =
      !manifest ||
      manifest.integration_type !== "entity" ||
      !manifest.is_built_in;

    for (const service of Object.keys(services[domain])) {
      result.push(
        getServiceListItem(
          localize,
          services,
          domain,
          service,
          showDomainPrefix
        )
      );
    }
  };

  if (isDynamic(group)) {
    addDomain(getValueFromDynamic(group!));
    return sortByName(result, language);
  }

  if (group) {
    return [];
  }

  Object.keys(services)
    .sort()
    .forEach((domain) => addDomain(domain));

  return result;
};

export const getAllItems = (
  sources: ElementSources
): AddAutomationElementListItem[] => {
  const { type, localize } = sources;

  const flattenGroups = (
    groups: AutomationElementGroup
  ): AddAutomationElementListItem[] =>
    Object.entries(groups).flatMap(([key, options]) =>
      options.members
        ? flattenGroups(options.members)
        : options.domains
          ? // domain elements are appended below from the backend descriptions
            []
          : [convertToItem(key, options, type, localize)]
    );

  const items = flattenGroups(getGroups(type));
  if (type === "trigger") {
    items.push(...getTriggerItems(sources, undefined));
  } else if (type === "condition") {
    items.push(...getConditionItems(sources, undefined));
  } else if (type === "action") {
    items.push(...getServiceItems(sources));
  }

  return items.filter(({ name }) => name);
};

export const getCollections = (
  sources: ElementSources,
  usedDomains: Set<string> | undefined,
  activeSystemDomains: Set<string> | undefined
): CollectionGroup[] => {
  const {
    type,
    localize,
    language,
    services,
    triggerDescriptions,
    conditionDescriptions,
    manifests,
  } = sources;
  const generatedCollections: CollectionGroup[] = [];

  const exclusiveDomains = getExclusiveDomains(type);

  const domainList =
    type === "trigger"
      ? Object.keys(triggerDescriptions ?? {}).map(getTriggerDomain)
      : type === "condition"
        ? Object.keys(conditionDescriptions ?? {}).map(getConditionDomain)
        : Object.keys(services ?? {});

  ELEMENT_TYPES[type].collections.forEach((collection, index) => {
    let collectionGroups = Object.entries(collection.groups);
    const groups: AddAutomationElementListItem[] = [];

    const types: CollectionGroupType[] = [];
    if (collection.groups.dynamicGroups) {
      types.push("dynamic");
    }
    if (collection.groups.helpers) {
      types.push("helper");
    }
    if (collection.groups.integrationGroups) {
      types.push("integration");
    }

    if (types.length) {
      groups.push(
        ...getDynamicDomainGroups(
          localize,
          language,
          domainList,
          manifests,
          types,
          {
            type,
            usedDomains,
            activeSystemDomains,
            exclusiveDomains,
          }
        )
      );

      collectionGroups = collectionGroups.filter(
        ([key]) => !DYNAMIC_KEYWORDS.includes(key)
      );
    }

    groups.push(
      ...collectionGroups
        .filter(([, options]) =>
          groupHasItems(type, options, getDescriptions(sources))
        )
        .map(([key, options]) => convertToItem(key, options, type, localize))
    );

    if (groups.length) {
      generatedCollections.push({
        collectionIndex: index,
        titleKey: collection.titleKey,
        generic: collection.generic,
        groups: sortByName(groups, language),
      });
    }
  });

  return generatedCollections;
};

export const getBlockItems = (
  type: AddElementType,
  localize: LocalizeFunc,
  language: string
): AddAutomationElementListItem[] =>
  sortByName(
    Object.entries(BUILDING_BLOCKS[type]).map(([key, options]) =>
      convertToItem(key, options, type, localize)
    ),
    language
  );

export const getGroupItems = (
  sources: ElementSources,
  group: string,
  collectionIndex: number,
  systemDomainsByEntityDomain: Map<string, Set<string>> | undefined
): AddAutomationElementListItem[] => {
  const { type, localize, language } = sources;

  if (isDynamic(group)) {
    if (type === "trigger") {
      return getTriggerItems(sources, systemDomainsByEntityDomain, group);
    }
    if (type === "condition") {
      return getConditionItems(sources, systemDomainsByEntityDomain, group);
    }
    return getServiceItems(sources, group);
  }

  const groupDef = findGroupDefinition(type, group, collectionIndex);
  const descriptions = getDescriptions(sources);

  if (groupDef?.domains && !groupDef.members) {
    // Curated group whose items come solely from backend domains (e.g. Sun).
    return sortByName(
      getDomainElementItems(type, groupDef.domains, localize, descriptions),
      language
    );
  }

  const result = Object.entries(getGroups(type, group, collectionIndex)).map(
    ([key, options]) => convertToItem(key, options, type, localize)
  );
  if (groupDef?.domains) {
    // Curated group with both static members and backend domains (Time).
    result.push(
      ...getDomainElementItems(type, groupDef.domains, localize, descriptions)
    );
  }
  return sortByName(result, language);
};

export const getTimeLocationGroups = (
  sources: ElementSources
): AddAutomationElementListItem[] => {
  const { type, localize } = sources;
  if (type !== "trigger" && type !== "condition") {
    return [];
  }
  const descriptions = getDescriptions(sources);
  return TIME_LOCATION_GROUPS.map(
    (group) =>
      [group, ELEMENT_TYPES[type].collections[0].groups[group]] as const
  )
    .filter(
      ([, options]) => options && groupHasItems(type, options, descriptions)
    )
    .map(([group, options]) => convertToItem(group, options, type, localize))
    .filter((item) => item.name);
};

const findRenderedGroup = (
  type: AddElementType,
  key: string,
  collections: CollectionGroup[]
): AddAutomationElementListItem | undefined => {
  const groupKey = findElementGroupKey(
    type,
    ELEMENT_TYPES[type].collections,
    key
  );
  // Elements that are a row of their own resolve to a group that isn't rendered
  return collections
    .flatMap((collection) => collection.groups)
    .find((group) => group.key === groupKey);
};

export const getRecentElements = (
  type: AddElementType,
  recents: string[] | undefined,
  items: AddAutomationElementListItem[],
  collections: CollectionGroup[]
): RecentElement[] => {
  if (!Array.isArray(recents)) {
    return [];
  }
  return recents
    .map((key) => items.find((item) => item.key === key))
    .filter((item) => item !== undefined)
    .slice(0, MAX_RECENT_ELEMENTS)
    .map((item) => ({
      item,
      groupName: findRenderedGroup(type, item.key, collections)?.name,
    }));
};
