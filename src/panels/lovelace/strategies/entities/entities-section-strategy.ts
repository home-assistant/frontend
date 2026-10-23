import type { HassServiceTarget } from "home-assistant-js-websocket";
import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { ensureArray } from "../../../../common/array/ensure-array";
import { getAreasFloorHierarchy } from "../../../../common/areas/areas-floor-hierarchy";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeEntityNameDisplay } from "../../../../common/entity/compute_entity_name_display";
import type { EntityNameItem } from "../../../../common/entity/entity_name_config";
import { getEntityAreaId } from "../../../../common/entity/context/get_entity_context";
import { stringCompare } from "../../../../common/string/compare";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import { NO_DEVICE_CLASS } from "../../../../data/entity/device_class";
import {
  computeEntityTypeNames,
  entityTypeFilterFunc,
  entityTypeKey,
} from "../../../../data/entity/entity_type";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import { resolveEntityIDs } from "../../../../data/selector";
import type { HassServiceTargetWithExclude } from "../../../../data/target";
import type { HomeAssistant } from "../../../../types";
import type {
  HeadingCardConfig,
  MarkdownCardConfig,
  TileCardConfig,
} from "../../cards/types";
import type {
  LovelaceStrategyDependency,
  LovelaceStrategyEditor,
} from "../types";

export const ENTITIES_SECTION_GROUPS = [
  "none",
  "area",
  "floor",
  "type",
] as const;

export type EntitiesSectionGroup = (typeof ENTITIES_SECTION_GROUPS)[number];

export interface EntitiesSectionStrategyConfig {
  type: "entities";
  title?: string;
  target?: HassServiceTargetWithExclude;
  entity_types?: string[];
  include_config_and_diagnostic?: boolean;
  group_by?: EntitiesSectionGroup;
  name?: "" | EntityNameItem | EntityNameItem[];
}

interface EntityGroup {
  name?: string;
  entityIds: string[];
}

const TARGET_KEYS = [
  "entity_id",
  "device_id",
  "area_id",
  "floor_id",
  "label_id",
] as const satisfies readonly (keyof HassServiceTarget)[];

const hasTargets = (target: HassServiceTarget): boolean =>
  TARGET_KEYS.some((key) => ensureArray(target[key] ?? []).length > 0);

const computeTileConfig = (
  entityId: string,
  name?: EntitiesSectionStrategyConfig["name"]
): TileCardConfig => ({
  type: "tile",
  entity: entityId,
  ...(name !== undefined ? { name } : {}),
});

const addToGroup = <T>(groups: Map<T, string[]>, key: T, entityId: string) => {
  const entityIds = groups.get(key);
  if (entityIds) {
    entityIds.push(entityId);
    return;
  }
  groups.set(key, [entityId]);
};

// Groups follow the order of the picked types, each entity going to the type
// that picked it: its domain, or its domain and device class.
const groupByType = (
  hass: HomeAssistant,
  localize: LocalizeFunc,
  entityIds: string[],
  types: string[]
): EntityGroup[] => {
  const byType = new Map<string, string[]>();
  for (const entityId of entityIds) {
    const domain = computeDomain(entityId);
    if (types.includes(domain)) {
      addToGroup(byType, domain, entityId);
      continue;
    }
    const deviceClass =
      hass.states[entityId]?.attributes.device_class || NO_DEVICE_CLASS;
    addToGroup(byType, entityTypeKey(domain, deviceClass), entityId);
  }

  const names = computeEntityTypeNames(localize, types);
  return types
    .filter((type) => byType.has(type))
    .map((type) => ({ name: names.get(type), entityIds: byType.get(type)! }));
};

// Groups follow the floor and area order of the home. Entities without a
// known area or floor go to a last group.
const groupByPlace = (
  hass: HomeAssistant,
  entityIds: string[],
  groupBy: "area" | "floor"
): EntityGroup[] => {
  const hierarchy = getAreasFloorHierarchy(
    Object.values(hass.floors),
    Object.values(hass.areas)
  );
  const orderedGroupIds =
    groupBy === "area"
      ? [
          ...hierarchy.floors.flatMap((floor) => floor.areas),
          ...hierarchy.areas,
        ]
      : hierarchy.floors.map((floor) => floor.id);
  const knownGroupIds = new Set(orderedGroupIds);

  const groupIdOf = (entityId: string): string | undefined => {
    const areaId = getEntityAreaId(entityId, hass.entities, hass.devices);
    if (!areaId) {
      return undefined;
    }
    const groupId =
      groupBy === "area" ? areaId : (hass.areas[areaId]?.floor_id ?? undefined);
    return groupId && knownGroupIds.has(groupId) ? groupId : undefined;
  };

  const byGroup = new Map<string | undefined, string[]>();
  for (const entityId of entityIds) {
    addToGroup(byGroup, groupIdOf(entityId), entityId);
  }

  const groupName = (groupId: string) =>
    groupBy === "area" ? hass.areas[groupId]?.name : hass.floors[groupId]?.name;

  const groups: EntityGroup[] = orderedGroupIds
    .filter((groupId) => byGroup.has(groupId))
    .map((groupId) => ({
      name: groupName(groupId),
      entityIds: byGroup.get(groupId)!,
    }));

  const ungrouped = byGroup.get(undefined);
  if (ungrouped) {
    groups.push({
      name: hass.localize("ui.panel.lovelace.strategy.entities.other"),
      entityIds: ungrouped,
    });
  }

  return groups;
};

const findAreaWithMostLights = (hass: HomeAssistant): string | undefined => {
  const lightCountByArea = new Map<string, number>();
  for (const entry of Object.values(hass.entities)) {
    if (computeDomain(entry.entity_id) !== "light" || entry.hidden) {
      continue;
    }
    const areaId = getEntityAreaId(
      entry.entity_id,
      hass.entities,
      hass.devices
    );
    if (areaId) {
      lightCountByArea.set(areaId, (lightCountByArea.get(areaId) ?? 0) + 1);
    }
  }

  let bestAreaId: string | undefined;
  let bestCount = 0;
  for (const [areaId, count] of lightCountByArea) {
    if (count > bestCount) {
      bestAreaId = areaId;
      bestCount = count;
    }
  }
  return bestAreaId;
};

@customElement("entities-section-strategy")
export class EntitiesSectionStrategy extends ReactiveElement {
  static registryDependencies: readonly LovelaceStrategyDependency[] = [
    "entities",
    "devices",
    "areas",
    "floors",
  ];

  public static async getConfigElement(): Promise<LovelaceStrategyEditor> {
    await import("./hui-entities-section-strategy-editor");
    return document.createElement("hui-entities-section-strategy-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant
  ): EntitiesSectionStrategyConfig {
    const areaId = findAreaWithMostLights(hass) ?? Object.keys(hass.areas)[0];
    const config: EntitiesSectionStrategyConfig = {
      type: "entities",
      entity_types: ["light"],
    };
    if (areaId) {
      return { ...config, target: { area_id: areaId } };
    }
    return config;
  }

  static async generate(
    config: EntitiesSectionStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceSectionConfig> {
    const section: LovelaceSectionConfig = {
      type: "grid",
      cards: [],
    };

    if (config.title) {
      section.cards!.push({
        type: "heading",
        heading: config.title,
      } satisfies HeadingCardConfig);
    }

    if (
      !config.target ||
      !hasTargets(config.target) ||
      !config.entity_types?.length
    ) {
      section.cards!.push({
        type: "markdown",
        content: hass.localize(
          "ui.panel.lovelace.strategy.entities.no_criteria"
        ),
      } satisfies MarkdownCardConfig);
      return section;
    }

    const explicitEntityIds = new Set(
      ensureArray(config.target?.entity_id ?? [])
    );
    const targetLabelIds = ensureArray(config.target?.label_id ?? []);
    const matchesType = entityTypeFilterFunc(config.entity_types, hass.states);

    const isShown = (entityId: string) => {
      if (explicitEntityIds.has(entityId)) {
        return true;
      }
      const entry = hass.entities[entityId];
      if (!entry) {
        return true;
      }
      if (entry.hidden) {
        return false;
      }
      if (config.include_config_and_diagnostic) {
        return true;
      }
      const directlyLabelled = targetLabelIds.some((labelId) =>
        entry.labels.includes(labelId)
      );
      return directlyLabelled || !entry.entity_category;
    };

    const shownEntityIds = resolveEntityIDs(
      hass,
      config.target,
      hass.entities,
      hass.devices,
      hass.areas
    )
      .filter(matchesType)
      .filter(isShown);

    // An empty name hides the name on the tiles, which are then sorted by
    // their default name.
    const names = new Map(
      shownEntityIds.map((entityId) => {
        const stateObj = hass.states[entityId];
        const name = stateObj
          ? computeEntityNameDisplay(stateObj, config.name || undefined, hass)
          : entityId;
        return [entityId, name];
      })
    );
    const entityIds = shownEntityIds.sort((entityId1, entityId2) =>
      stringCompare(
        names.get(entityId1)!,
        names.get(entityId2)!,
        hass.locale.language
      )
    );

    if (!entityIds.length) {
      section.cards!.push({
        type: "markdown",
        content: hass.localize(
          "ui.panel.lovelace.strategy.entities.no_entities"
        ),
      } satisfies MarkdownCardConfig);
      return section;
    }

    const groupBy = config.group_by ?? "none";
    let groups: EntityGroup[] = [{ entityIds }];
    if (groupBy === "type") {
      const localize = await hass.loadBackendTranslation("title");
      groups = groupByType(hass, localize, entityIds, config.entity_types);
    } else if (groupBy !== "none") {
      groups = groupByPlace(hass, entityIds, groupBy);
    }
    const showGroupNames = groups.length > 1;

    for (const group of groups) {
      if (showGroupNames && group.name) {
        section.cards!.push({
          type: "heading",
          heading_style: "subtitle",
          heading: group.name,
        } satisfies HeadingCardConfig);
      }
      section.cards!.push(
        ...group.entityIds.map((entityId) =>
          computeTileConfig(entityId, config.name)
        )
      );
    }

    return section;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "entities-section-strategy": EntitiesSectionStrategy;
  }
}
