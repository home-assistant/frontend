import type { HassEntity } from "home-assistant-js-websocket";
import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { getAreasFloorHierarchy } from "../../../common/areas/areas-floor-hierarchy";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { ALERT_DOMAINS } from "../../../common/entity/alert_active";
import { computeDomain } from "../../../common/entity/compute_domain";
import {
  findFilteredEntities,
  generateEntityFilter,
  type EntityFilter,
  type EntityFilterSources,
} from "../../../common/entity/entity_filter";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { floorDefaultIcon } from "../../../components/ha-floor-icon";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import { isStrategySection } from "../../../data/lovelace/config/section";
import type {
  LovelaceSectionConfig,
  LovelaceSectionRawConfig,
} from "../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { SecurityAlertEntityConfig } from "../../../data/frontend";
import type { HomeAssistant } from "../../../types";
import type {
  EntityVisibilityCardConfig,
  LogbookCardConfig,
} from "../../lovelace/cards/types";
import { computeAreaTileCardConfig } from "../../lovelace/strategies/areas/helpers/areas-strategy-helper";
import {
  wrapEntityVisibility,
  type ComputeEntityCard,
} from "../../lovelace/strategies/helpers/entity-visibility";
import { computeFavoriteCardConfig } from "../../lovelace/strategies/helpers/favorite-cards";
import {
  computeSecurityAlertCardConfig,
  computeSecurityAlertColor,
  resolveSecurityAlertSeverity,
} from "./security-alerts";

export interface SecurityViewStrategyConfig {
  type: "security";
  alert_entities?: SecurityAlertEntityConfig[];
  favorite_entities?: string[];
  hidden_entities?: string[];
  edit_visibility?: boolean;
}

export const securityEntityFilters: EntityFilter[] = [
  {
    domain: "camera",
    entity_category: "none",
  },
  {
    domain: "alarm_control_panel",
    entity_category: "none",
  },
  {
    domain: "lock",
    entity_category: "none",
  },
  {
    domain: "cover",
    device_class: ["door", "garage", "gate", "window"],
    entity_category: "none",
  },
  {
    domain: "binary_sensor",
    device_class: [
      // Locks
      "lock",
      // Openings
      "door",
      "window",
      "garage_door",
      "opening",
      // Safety
      "carbon_monoxide",
      "gas",
      "glass_break",
      "moisture",
      "safety",
      "smoke",
      "tamper",
    ],
    entity_category: "none",
  },
  // We also want the tamper sensors when they are diagnostic
  {
    domain: "binary_sensor",
    device_class: ["tamper"],
    entity_category: "diagnostic",
  },
];

export const findSecurityEntities = (
  sources: EntityFilterSources,
  hiddenEntities?: string[]
): string[] =>
  findFilteredEntities(sources, securityEntityFilters, hiddenEntities);

export const isSecurityPanelEntity = (
  hass: EntityFilterSources,
  stateObj: HassEntity
): boolean =>
  securityEntityFilters.some((filter) =>
    generateEntityFilter(
      hass.states,
      hass.entities,
      hass.devices,
      hass.areas,
      hass.floors,
      filter
    )(stateObj.entity_id)
  );

const processAreasForSecurity = (
  areaIds: string[],
  hass: HomeAssistant,
  entities: string[],
  computeCard: ComputeEntityCard
): LovelaceCardConfig[] => {
  const cards: LovelaceCardConfig[] = [];

  for (const areaId of areaIds) {
    const area = hass.areas[areaId];
    if (!area) continue;

    const areaFilter = generateEntityFilter(
      hass.states,
      hass.entities,
      hass.devices,
      hass.areas,
      hass.floors,
      {
        area: area.area_id,
      }
    );
    const areaSecurityEntities = entities.filter(areaFilter);
    const areaCards: LovelaceCardConfig[] = [];

    for (const entityId of areaSecurityEntities) {
      areaCards.push(computeCard(entityId));
    }

    if (areaCards.length > 0) {
      cards.push({
        heading_style: "subtitle",
        type: "heading",
        heading: area.name,
        tap_action: hass.panels.home
          ? {
              action: "navigate",
              navigation_path: `/home/areas-${area.area_id}`,
            }
          : undefined,
      });
      cards.push(...areaCards);
    }
  }

  return cards;
};

const processUnassignedEntities = (
  hass: HomeAssistant,
  entities: string[],
  computeCard: ComputeEntityCard
): LovelaceCardConfig[] => {
  const unassignedFilter = generateEntityFilter(
    hass.states,
    hass.entities,
    hass.devices,
    hass.areas,
    hass.floors,
    {
      area: null,
    }
  );
  const unassignedLights = entities.filter(unassignedFilter);
  const areaCards: LovelaceCardConfig[] = [];

  for (const entityId of unassignedLights) {
    areaCards.push(computeCard(entityId));
  }

  return areaCards;
};

@customElement("security-view-strategy")
export class SecurityViewStrategy extends ReactiveElement {
  static async generate(
    config: SecurityViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const areas = Object.values(hass.areas);
    const floors = Object.values(hass.floors);
    const hierarchy = getAreasFloorHierarchy(floors, areas);

    const sections: LovelaceSectionRawConfig[] = [];

    const editVisibility = Boolean(config.edit_visibility);
    const entities = findSecurityEntities(
      hass,
      editVisibility ? undefined : config.hidden_entities
    );
    const pageEntities = new Set(entities);

    const favoriteEntities = editVisibility
      ? (config.favorite_entities ?? [])
      : (config.favorite_entities ?? []).filter(
          (entityId) =>
            hass.states[entityId] &&
            isSecurityPanelEntity(hass, hass.states[entityId])
        );

    const favoriteSet = new Set(config.favorite_entities);
    const alertEntities = new Map(
      (config.alert_entities ?? []).map((alertEntity) => [
        alertEntity.entity,
        alertEntity,
      ])
    );
    const computeEditExtras = (
      entityId: string
    ): Pick<EntityVisibilityCardConfig, "favorite" | "alert"> => {
      const alertEntity = alertEntities.get(entityId);
      return {
        favorite: favoriteSet.has(entityId),
        alert: ALERT_DOMAINS.includes(computeDomain(entityId))
          ? alertEntity
            ? resolveSecurityAlertSeverity(alertEntity, hass.states[entityId])
            : "none"
          : undefined,
      };
    };
    const wrapCard = (computeCard: ComputeEntityCard): ComputeEntityCard =>
      editVisibility
        ? wrapEntityVisibility(
            new Set(config.hidden_entities),
            computeCard,
            computeEditExtras
          )
        : computeCard;
    const computeCard = wrapCard(computeAreaTileCardConfig(hass, false));

    const floorCount =
      hierarchy.floors.length + (hierarchy.areas.length ? 1 : 0);

    // Process floors
    for (const floorStructure of hierarchy.floors) {
      const floorId = floorStructure.id;
      const areaIds = floorStructure.areas;
      const floor = hass.floors[floorId];

      const section: LovelaceSectionRawConfig = {
        type: "grid",
        column_span: 2,
        cards: [
          {
            type: "heading",
            heading:
              floorCount > 1
                ? floor.name
                : hass.localize("ui.panel.lovelace.strategy.home.areas"),
            icon: floor.icon || floorDefaultIcon(floor),
          },
        ],
      };

      const areaCards = processAreasForSecurity(
        areaIds,
        hass,
        entities,
        computeCard
      );

      if (areaCards.length > 0) {
        section.cards!.push(...areaCards);
        sections.push(section);
      }
    }

    // Process unassigned areas
    if (hierarchy.areas.length > 0) {
      const section: LovelaceSectionRawConfig = {
        type: "grid",
        column_span: 2,
        cards: [
          {
            type: "heading",
            heading:
              floorCount > 1
                ? hass.localize("ui.panel.lovelace.strategy.home.other_areas")
                : hass.localize("ui.panel.lovelace.strategy.home.areas"),
          },
        ],
      };

      const areaCards = processAreasForSecurity(
        hierarchy.areas,
        hass,
        entities,
        computeCard
      );

      if (areaCards.length > 0) {
        section.cards!.push(...areaCards);
        sections.push(section);
      }
    }

    // Process unassigned entities
    const unassignedCards = processUnassignedEntities(
      hass,
      entities,
      computeCard
    );

    if (unassignedCards.length > 0) {
      const section: LovelaceSectionRawConfig = {
        type: "grid",
        column_span: 2,
        cards: [
          {
            type: "heading",
            heading:
              sections.length > 0 || favoriteEntities.length > 0
                ? hass.localize(
                    "ui.panel.lovelace.strategy.security.other_devices"
                  )
                : hass.localize("ui.panel.lovelace.strategy.security.devices"),
          },
          ...unassignedCards,
        ],
      };
      sections.push(section);
    }

    if (favoriteEntities.length > 0) {
      const firstPageEntity = editVisibility
        ? sections
            .flatMap((section) =>
              isStrategySection(section) ? [] : (section.cards ?? [])
            )
            .find((card) => card.type === "entity-visibility")?.entity
        : undefined;
      const computeFavoriteCard = editVisibility
        ? (entityId: string, index: number): EntityVisibilityCardConfig => ({
            type: "entity-visibility",
            entity: entityId,
            neighbor_entity:
              favoriteEntities[index + 1] ?? favoriteEntities[index - 1],
            fallback_entity: firstPageEntity,
            ...computeEditExtras(entityId),
            card: computeFavoriteCardConfig(entityId),
          })
        : computeFavoriteCardConfig;
      sections.unshift({
        type: "grid",
        column_span: 2,
        cards: [
          {
            type: "heading",
            heading: hass.localize(
              "ui.panel.lovelace.strategy.security.favorites"
            ),
            heading_style: "title",
          },
          ...favoriteEntities.map(computeFavoriteCard),
        ],
      });
    }

    // Build sidebar with activity log
    const hasLogbook = isComponentLoaded(hass.config, "logbook");

    // Collect person entity IDs
    const personEntities = Object.keys(hass.states).filter(
      (entityId) => computeStateDomain(hass.states[entityId]) === "person"
    );

    const logbookEntityIds = [...entities, ...personEntities];

    const sidebarSections: LovelaceSectionConfig[] = [];

    const alertEntityConfigs = (config.alert_entities ?? []).filter(
      (alertEntity) => ALERT_DOMAINS.includes(computeDomain(alertEntity.entity))
    );

    const alertCards = editVisibility
      ? undefined
      : alertEntityConfigs.map((alertEntity) =>
          computeSecurityAlertCardConfig(
            hass.states[alertEntity.entity],
            alertEntity
          )
        );

    if (editVisibility && alertEntityConfigs.length) {
      sidebarSections.push({
        type: "grid",
        cards: [
          {
            type: "heading",
            heading: hass.localize(
              "ui.panel.lovelace.strategy.security.active_alerts"
            ),
            heading_style: "title",
          },
          ...alertEntityConfigs.map(
            (alertEntity, index): EntityVisibilityCardConfig => {
              const stateObj = hass.states[alertEntity.entity];
              const severity = resolveSecurityAlertSeverity(
                alertEntity,
                stateObj
              );
              const color = computeSecurityAlertColor(severity);
              return {
                type: "entity-visibility",
                entity: alertEntity.entity,
                favorite: favoriteSet.has(alertEntity.entity),
                alert: severity,
                alert_select: true,
                neighbor_entity: (
                  alertEntityConfigs[index + 1] ?? alertEntityConfigs[index - 1]
                )?.entity,
                fallback_entity: pageEntities.has(alertEntity.entity)
                  ? alertEntity.entity
                  : undefined,
                grid_options: { columns: 12 },
                card: {
                  type: "alert",
                  entity: alertEntity.entity,
                  alert_color: color,
                  clear_color: color,
                },
              };
            }
          ),
        ] satisfies LovelaceCardConfig[],
      });
    } else if (alertCards?.length) {
      sidebarSections.push({
        type: "grid",
        visibility: [
          {
            condition: "or",
            conditions: alertCards.map((alertCard) => ({
              condition: "and",
              conditions: alertCard.visibility!,
            })),
          },
        ],
        cards: [
          {
            type: "heading",
            heading: hass.localize(
              "ui.panel.lovelace.strategy.security.active_alerts"
            ),
            heading_style: "title",
          },
          ...alertCards.map((alertCard) => ({
            ...alertCard,
            grid_options: { columns: 12 },
          })),
        ] satisfies LovelaceCardConfig[],
      });
    }

    const hasLogbookSection = hasLogbook && logbookEntityIds.length > 0;
    if (hasLogbookSection) {
      sidebarSections.push({
        type: "grid",
        cards: [
          {
            type: "heading",
            heading: hass.localize(
              "ui.panel.lovelace.strategy.security.activity"
            ),
            heading_style: "title",
          } as LovelaceCardConfig,
          {
            type: "logbook",
            target: {
              entity_id: logbookEntityIds,
            },
            hours_to_show: 24,
            grid_options: { columns: 12 },
          } satisfies LogbookCardConfig,
        ],
      });
    }

    return {
      type: "sections",
      max_columns: 3,
      sections: sections,
      ...(sidebarSections.length > 0 && {
        sidebar: {
          sections: sidebarSections,
          ...(!hasLogbookSection && alertCards?.length
            ? {
                visibility: [
                  {
                    condition: "or" as const,
                    conditions: alertCards.map((alertCard) => ({
                      condition: "and" as const,
                      conditions: alertCard.visibility!,
                    })),
                  },
                ],
              }
            : {}),
          content_label: hass.localize(
            "ui.panel.lovelace.strategy.security.devices"
          ),
          sidebar_label: hass.localize(
            "ui.panel.lovelace.strategy.security.activity"
          ),
        },
      }),
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "security-view-strategy": SecurityViewStrategy;
  }
}
