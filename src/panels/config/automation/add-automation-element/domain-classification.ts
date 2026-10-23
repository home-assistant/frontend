import { html } from "lit";
import { ensureArray } from "../../../../common/array/ensure-array";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { stringCompare } from "../../../../common/string/compare";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-domain-icon";
import { DYNAMIC_PREFIX } from "../../../../data/automation";
import type { ConditionDescriptions } from "../../../../data/condition";
import type { DomainManifestLookup } from "../../../../data/integration";
import { domainToName } from "../../../../data/integration";
import { filterSelectorEntities } from "../../../../data/selector";
import type { TriggerDescriptions } from "../../../../data/trigger";
import type { HomeAssistant } from "../../../../types";
import { ENTITY_DOMAINS_MAIN, ENTITY_DOMAINS_OTHER } from "./constants";
import type {
  AddAutomationElementListItem,
  AddElementType,
  CollectionGroupType,
  SystemDomains,
} from "./types";

export interface DomainClassificationOptions {
  type: AddElementType;
  usedDomains?: Set<string>;
  activeSystemDomains?: Set<string>;
}

/**
 * The collection placeholder a domain's group belongs to, or undefined when
 * the domain is not listed.
 */
export const classifyDomain = (
  domain: string,
  manifest: DomainManifestLookup[string] | undefined,
  options: DomainClassificationOptions
): CollectionGroupType | undefined => {
  const integrationType = manifest?.integration_type;

  if (integrationType === "helper") {
    return "helper";
  }

  if (ENTITY_DOMAINS_MAIN.has(domain) || integrationType === "entity") {
    // Core entity domains. Actions always list them; triggers/conditions
    // only when matching entities exist or a system domain covers them.
    if (
      options.type === "action" ||
      !options.usedDomains ||
      options.usedDomains.has(domain) ||
      ENTITY_DOMAINS_OTHER.has(domain) ||
      (options.activeSystemDomains?.has(domain) ?? false)
    ) {
      return "dynamic";
    }
    return undefined;
  }

  if (integrationType === "system" && options.type !== "action") {
    return options.activeSystemDomains?.has(domain) ? "dynamic" : undefined;
  }

  // Integrations that bring their own elements, built-in (like Apple TV,
  // FFmpeg) and custom (like HACS) alike.
  return "integration";
};

/** The collection group key a domain is sorted under when browsing by target. */
export const getDomainGroupKey = (
  domain: string,
  manifests: DomainManifestLookup | undefined,
  options: DomainClassificationOptions
): "helpers" | "integrationGroups" | "dynamicGroups" => {
  const groupType = classifyDomain(domain, manifests?.[domain], options);
  if (groupType === "helper") {
    return "helpers";
  }
  if (groupType === "integration") {
    return "integrationGroups";
  }
  // "dynamic", plus domains hidden in the by-type list (like unused entity
  // domains) that can still surface when browsing by target.
  return "dynamicGroups";
};

/**
 * System and entity integrations without entities of their own (like
 * "person" conditions on zones), active when an entity matches their targets.
 */
export const calculateActiveSystemDomains = (
  descriptions: TriggerDescriptions | ConditionDescriptions,
  manifests: DomainManifestLookup,
  getDomain: (key: string) => string,
  states: HomeAssistant["states"]
): SystemDomains => {
  const active = new Set<string>();
  // Group all entity filters by domain
  const domainFilters: Record<
    string,
    Parameters<typeof filterSelectorEntities>[0][]
  > = {};
  // Also collect which entity domains each domain targets
  const entityDomainsPerDomain: Record<string, Set<string>> = {};
  for (const [key, desc] of Object.entries(descriptions)) {
    const domain = getDomain(key);
    const integrationType = manifests[domain]?.integration_type;
    if (integrationType !== "system" && integrationType !== "entity") {
      continue;
    }
    // For entity-type domains that have their own entities, the normal
    // domainUsed check handles them — only process those without entities.
    if (
      integrationType === "entity" &&
      Object.keys(states).some((id) => computeDomain(id) === domain)
    ) {
      continue;
    }
    if (!domainFilters[domain]) {
      domainFilters[domain] = [];
      entityDomainsPerDomain[domain] = new Set();
    }
    const entityFilters = ensureArray(desc.target?.entity);
    if (entityFilters) {
      // target.entity can be EntitySelectorFilter | readonly EntitySelectorFilter[]
      // ensureArray wraps it but each element may still be an array, so flatten
      for (const filterOrArray of entityFilters) {
        const filters = ensureArray(filterOrArray);
        domainFilters[domain].push(...filters);
        for (const filter of filters) {
          for (const entityDomain of ensureArray(filter.domain) ?? []) {
            entityDomainsPerDomain[domain].add(entityDomain);
          }
        }
      }
    }
  }
  // Check each entity against the filters
  for (const entity of Object.values(states)) {
    for (const [domain, filters] of Object.entries(domainFilters)) {
      if (active.has(domain)) {
        continue;
      }
      if (filters.some((f) => filterSelectorEntities(f, entity))) {
        active.add(domain);
      }
    }
  }
  // Build reverse map: entity domain → set of domains that cover it
  const byEntityDomain = new Map<string, Set<string>>();
  for (const [systemDomain, entityDomains] of Object.entries(
    entityDomainsPerDomain
  )) {
    for (const entityDomain of entityDomains) {
      if (!byEntityDomain.has(entityDomain)) {
        byEntityDomain.set(entityDomain, new Set());
      }
      byEntityDomain.get(entityDomain)!.add(systemDomain);
    }
  }
  return { active, byEntityDomain };
};

/** Generated domain groups for the given collection placeholder types. */
export const getDynamicDomainGroups = (
  localize: LocalizeFunc,
  language: string,
  domains: string[],
  manifests: DomainManifestLookup | undefined,
  types: CollectionGroupType[],
  options: DomainClassificationOptions & { exclusiveDomains?: Set<string> }
): AddAutomationElementListItem[] => {
  if (!manifests) {
    return [];
  }
  const result: AddAutomationElementListItem[] = [];
  const addedDomains = new Set<string>();
  domains.forEach((domain) => {
    if (addedDomains.has(domain) || options.exclusiveDomains?.has(domain)) {
      return;
    }
    addedDomains.add(domain);

    const manifest = manifests[domain];
    const groupType = classifyDomain(domain, manifest, options);

    if (groupType && types.includes(groupType)) {
      result.push({
        icon: html`
          <ha-domain-icon .domain=${domain} brand-fallback></ha-domain-icon>
        `,
        key: `${DYNAMIC_PREFIX}${domain}`,
        name: domainToName(localize, domain, manifest),
        description: "",
      });
    }
  });
  return result.sort((a, b) => stringCompare(a.name, b.name, language));
};
