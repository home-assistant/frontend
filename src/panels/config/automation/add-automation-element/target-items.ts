import { computeDomain } from "../../../../common/entity/compute_domain";
import { isNumericState } from "../../../../common/number/format_number";
import { stringCompare } from "../../../../common/string/compare";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../../common/translations/localize";
import { getConditionDomain } from "../../../../data/condition";
import { domainToName } from "../../../../data/integration";
import {
  getConditionsForTarget,
  getServicesForTarget,
  getTriggersForTarget,
  type SingleHassServiceTarget,
} from "../../../../data/target";
import { getTriggerDomain } from "../../../../data/trigger";
import type { HomeAssistant } from "../../../../types";
import { ELEMENT_TYPES, NUMERIC_DOMAINS } from "./constants";
import {
  getDomainGroupKey,
  type DomainClassificationOptions,
} from "./domain-classification";
import {
  convertToItem,
  getConditionListItem,
  getServiceListItem,
  getTriggerListItem,
} from "./element-items";
import type {
  AddAutomationElementListItem,
  AddElementType,
  ElementSources,
  ItemsSection,
} from "./types";

export const fetchTargetElementKeys = (
  callWS: HomeAssistant["callWS"],
  type: AddElementType,
  target: SingleHassServiceTarget
): Promise<string[]> =>
  type === "trigger"
    ? getTriggersForTarget(callWS, target)
    : type === "condition"
      ? getConditionsForTarget(callWS, target)
      : getServicesForTarget(callWS, target);

export const sortDomainsByCollection = (
  type: AddElementType,
  entries: [string, ItemsSection][],
  language: string,
  getGroupKey: (domain: string) => string
): ItemsSection[] => {
  const order: string[] = [];

  ELEMENT_TYPES[type].collections.forEach((collection) => {
    order.push(...Object.keys(collection.groups));
  });

  return entries
    .sort((a, b) => {
      const domainA = a[0];
      const domainB = b[0];

      if (order.includes(domainA) && order.includes(domainB)) {
        return order.indexOf(domainA) - order.indexOf(domainB);
      }

      const typeA = order.includes(domainA) ? domainA : getGroupKey(domainA);
      const typeB = order.includes(domainB) ? domainB : getGroupKey(domainB);

      if (typeA === typeB) {
        return stringCompare(a[1].title, b[1].title, language);
      }
      return order.indexOf(typeA) - order.indexOf(typeB);
    })
    .map((entry) => entry[1]);
};

export const getDefaultStateItems = (
  type: "trigger" | "condition",
  localize: LocalizeFunc,
  entityId: string | undefined,
  states: HomeAssistant["states"]
): AddAutomationElementListItem[] => {
  const items = [convertToItem("state", {}, type, localize)];

  if (entityId) {
    const stateObj = states[entityId];
    if (
      NUMERIC_DOMAINS.includes(computeDomain(entityId)) ||
      (stateObj && isNumericState(stateObj))
    ) {
      items.push(convertToItem("numeric_state", {}, type, localize));
    }
  }

  return items;
};

export const getTargetSections = (
  sources: ElementSources,
  target: SingleHassServiceTarget,
  keys: string[],
  states: HomeAssistant["states"],
  classification: DomainClassificationOptions
): ItemsSection[] => {
  const { type, localize, language, manifests } = sources;
  const sections: Record<string, ItemsSection> = {};

  const addItem = (domain: string, item: AddAutomationElementListItem) => {
    if (!sections[domain]) {
      sections[domain] = {
        title: domainToName(localize, domain, manifests?.[domain]),
        items: [],
      };
    }
    sections[domain].items.push(item);
  };

  if (type === "action") {
    keys
      // homeassistant services are too generic to be applied on the selected target
      .filter((service) => !service.startsWith("homeassistant."))
      .forEach((key) => {
        const [domain, service] = key.split(".", 2);
        addItem(
          domain,
          // the section title already names the domain
          getServiceListItem(localize, sources.services, domain, service, false)
        );
      });
  } else {
    // When a specific entity is selected, system domain items are merged
    // under the entity's real domain rather than under their system domain name.
    const targetEntityId = target.entity_id;
    const targetEntityDomain =
      targetEntityId &&
      manifests?.[computeDomain(targetEntityId)]?.integration_type !== "system"
        ? computeDomain(targetEntityId)
        : undefined;

    const getDomain =
      type === "trigger" ? getTriggerDomain : getConditionDomain;
    const getListItem =
      type === "trigger" ? getTriggerListItem : getConditionListItem;

    keys.forEach((key) => {
      const itemDomain = getDomain(key);
      const isSystemDomain =
        manifests?.[itemDomain]?.integration_type === "system";
      addItem(
        isSystemDomain && targetEntityDomain ? targetEntityDomain : itemDomain,
        getListItem(localize, itemDomain, key)
      );
    });
  }

  Object.values(sections).forEach((section) =>
    section.items.sort((a, b) => stringCompare(a.name, b.name, language))
  );

  const result = sortDomainsByCollection(
    type,
    Object.entries(sections),
    language,
    (domain) => getDomainGroupKey(domain, manifests, classification)
  );

  if (type !== "action" && target.entity_id) {
    result.push({
      title: localize(
        `ui.panel.config.automation.editor.${type}s.groups.entity.label` as LocalizeKeys
      ),
      items: getDefaultStateItems(type, localize, target.entity_id, states),
    });
  }

  return result;
};
