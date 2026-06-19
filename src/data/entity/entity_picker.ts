import type { HassEntity } from "home-assistant-js-websocket";
import { getEntityAreaId } from "../../common/entity/context/get_entity_context";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeEntityNameList } from "../../common/entity/compute_entity_name_display";
import { computeStateName } from "../../common/entity/compute_state_name";
import type { RelatedIdSets } from "../../common/search/related-context";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import { computeRTL } from "../../common/util/compute_rtl";
import type { PickerComboBoxItem } from "../../components/ha-picker-combo-box";
import type { FuseWeightedKey } from "../../resources/fuseMultiTerm";
import type { HomeAssistant } from "../../types";
import { domainToName } from "../integration";
import type { HaEntityPickerEntityFilterFunc } from "./entity";

export interface EntityComboBoxItem extends PickerComboBoxItem {
  domain_name?: string;
  stateObj?: HassEntity;
  /**
   * Closeness to the active related context: 0 = the entity itself, 1 = its
   * device, 2 = its area, 3 = unrelated. Lower sorts first.
   */
  relatedRank?: number;
}

export const entityComboBoxKeys: FuseWeightedKey[] = [
  {
    name: "search_labels.entityName",
    weight: 10,
  },
  {
    name: "search_labels.friendlyName",
    weight: 8,
  },
  {
    name: "search_labels.deviceName",
    weight: 7,
  },
  {
    name: "search_labels.areaName",
    weight: 6,
  },
  {
    name: "search_labels.domainName",
    weight: 6,
  },
  {
    name: "search_labels.entityId",
    weight: 3,
  },
];

export interface GetEntitiesOptions {
  includeDomains?: string[];
  excludeDomains?: string[];
  entityFilter?: HaEntityPickerEntityFilterFunc;
  includeDeviceClasses?: string[];
  includeUnitOfMeasurement?: string[];
  includeEntities?: string[];
  excludeEntities?: string[];
  value?: string;
  idPrefix?: string;
}

export const getEntities = (
  hass: HomeAssistant,
  options?: GetEntitiesOptions
): EntityComboBoxItem[] => {
  const {
    includeDomains,
    excludeDomains,
    entityFilter,
    includeDeviceClasses,
    includeUnitOfMeasurement,
    includeEntities,
    excludeEntities,
    value,
    idPrefix = "",
  } = options ?? {};

  let items: EntityComboBoxItem[];

  let entityIds = Object.keys(hass.states);

  // These run over every entity, so use Sets for O(1) membership instead of
  // repeated Array.includes scans.
  if (includeEntities) {
    const includeEntitiesSet = new Set(includeEntities);
    entityIds = entityIds.filter((entityId) =>
      includeEntitiesSet.has(entityId)
    );
  }

  if (excludeEntities) {
    const excludeEntitiesSet = new Set(excludeEntities);
    entityIds = entityIds.filter(
      (entityId) => !excludeEntitiesSet.has(entityId)
    );
  }

  if (includeDomains) {
    const includeDomainsSet = new Set(includeDomains);
    entityIds = entityIds.filter((eid) =>
      includeDomainsSet.has(computeDomain(eid))
    );
  }

  if (excludeDomains) {
    const excludeDomainsSet = new Set(excludeDomains);
    entityIds = entityIds.filter(
      (eid) => !excludeDomainsSet.has(computeDomain(eid))
    );
  }

  // These values are the same for every entity, so compute them once instead
  // of inside the map over (potentially thousands of) entities.
  const isRTL = computeRTL(
    hass.language,
    hass.translationMetadata.translations
  );
  const domainNames = new Map<string, string>();

  items = entityIds.map<EntityComboBoxItem>((entityId) => {
    const stateObj = hass.states[entityId];

    const friendlyName = computeStateName(stateObj); // Keep this for search
    const [entityName, deviceName, areaName] = computeEntityNameList(
      stateObj,
      [{ type: "entity" }, { type: "device" }, { type: "area" }],
      hass.entities,
      hass.devices,
      hass.areas,
      hass.floors
    );

    const domain = computeDomain(entityId);
    let domainName = domainNames.get(domain);
    if (domainName === undefined) {
      domainName = domainToName(hass.localize, domain);
      domainNames.set(domain, domainName);
    }

    const primary = entityName || deviceName || entityId;
    const secondary = [areaName, entityName ? deviceName : undefined]
      .filter(Boolean)
      .join(isRTL ? " ◂ " : " ▸ ");

    return {
      id: `${idPrefix}${entityId}`,
      primary: primary,
      secondary: secondary,
      domain_name: domainName,
      sorting_label: [primary, secondary].filter(Boolean).join("_"),
      search_labels: {
        entityName: entityName || null,
        deviceName: deviceName || null,
        areaName: areaName || null,
        domainName: domainName || null,
        friendlyName: friendlyName || null,
        entityId: entityId,
      },
      stateObj: stateObj,
    };
  });

  if (includeDeviceClasses) {
    items = items.filter(
      (item) =>
        // We always want to include the entity of the current value
        item.id === value ||
        (item.stateObj?.attributes.device_class &&
          includeDeviceClasses.includes(item.stateObj.attributes.device_class))
    );
  }

  if (includeUnitOfMeasurement) {
    items = items.filter(
      (item) =>
        // We always want to include the entity of the current value
        item.id === value ||
        (item.stateObj?.attributes.unit_of_measurement &&
          includeUnitOfMeasurement.includes(
            item.stateObj.attributes.unit_of_measurement
          ))
    );
  }

  if (entityFilter) {
    items = items.filter(
      (item) =>
        // We always want to include the entity of the current value
        item.id === value || (item.stateObj && entityFilter!(item.stateObj))
    );
  }

  return items;
};

const RELATED_RANK_UNRELATED = 3;

const entityRelatedRank = (
  entityId: string | undefined,
  related: RelatedIdSets,
  entities: HomeAssistant["entities"],
  devices: HomeAssistant["devices"]
): number => {
  if (!entityId) {
    return RELATED_RANK_UNRELATED;
  }
  if (related.entities.has(entityId)) {
    return 0;
  }
  const deviceId = entities[entityId]?.device_id;
  if (deviceId && related.devices.has(deviceId)) {
    return 1;
  }
  const areaId = getEntityAreaId(entityId, entities, devices);
  if (areaId && related.areas.has(areaId)) {
    return 2;
  }
  return RELATED_RANK_UNRELATED;
};

/**
 * Annotate entity items with their closeness to the related context, so they
 * can be floated to the top. The entity itself ranks closest, then its device,
 * then its area; anything unrelated keeps the lowest rank.
 */
export const markEntitiesRelated = (
  items: EntityComboBoxItem[],
  related: RelatedIdSets,
  entities: HomeAssistant["entities"],
  devices: HomeAssistant["devices"]
): EntityComboBoxItem[] =>
  items.map((item) => ({
    ...item,
    relatedRank: entityRelatedRank(
      item.stateObj?.entity_id,
      related,
      entities,
      devices
    ),
  }));

/**
 * Sort entity items by related closeness (entity, then device, then area, then
 * the rest). Pass `language` to break ties within a tier alphabetically by
 * label; omit it to keep the incoming order (e.g. search relevance).
 */
export const sortEntitiesByRelatedRank = (
  items: EntityComboBoxItem[],
  language?: string
): EntityComboBoxItem[] =>
  [...items].sort((a, b) => {
    const rankDiff =
      (a.relatedRank ?? RELATED_RANK_UNRELATED) -
      (b.relatedRank ?? RELATED_RANK_UNRELATED);
    if (rankDiff !== 0 || language === undefined) {
      return rankDiff;
    }
    return caseInsensitiveStringCompare(
      a.sorting_label ?? "",
      b.sorting_label ?? "",
      language
    );
  });
