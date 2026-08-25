import type { HassEntity } from "home-assistant-js-websocket";
import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { getAreasFloorHierarchy } from "../../../common/areas/areas-floor-hierarchy";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import {
  findEntities,
  generateEntityFilter,
  type EntityFilter,
} from "../../../common/entity/entity_filter";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { floorDefaultIcon } from "../../../components/ha-floor-icon";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type {
  LovelaceSectionConfig,
  LovelaceSectionRawConfig,
} from "../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { SecurityAlertEntityConfig } from "../../../data/frontend";
import type { HomeAssistant } from "../../../types";
import type { LogbookCardConfig } from "../../lovelace/cards/types";
import { computeAreaTileCardConfig } from "../../lovelace/strategies/areas/helpers/areas-strategy-helper";
import { computeSecurityAlertCardConfig } from "./security-alerts";

export interface SecurityViewStrategyConfig {
  type: "security";
  alert_entities?: SecurityAlertEntityConfig[];
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

const _cachedSecurityEntityFilters = new WeakMap<
  Pick<HomeAssistant, "states" | "entities" | "devices" | "areas" | "floors">,
  ReturnType<typeof generateEntityFilter>[]
>();

const _getSecurityEntityFilters = (
  hass: Pick<
    HomeAssistant,
    "states" | "entities" | "devices" | "areas" | "floors"
  >
) => {
  let filters = _cachedSecurityEntityFilters.get(hass);
  if (!filters) {
    filters = securityEntityFilters.map((filter) =>
      generateEntityFilter(hass, filter)
    );
    _cachedSecurityEntityFilters.set(hass, filters);
  }
  return filters;
};

export const isSecurityPanelEntity = (
  hass: Pick<
    HomeAssistant,
    "states" | "entities" | "devices" | "areas" | "floors"
  >,
  stateObj: HassEntity
): boolean =>
  _getSecurityEntityFilters(hass).some((filter) => filter(stateObj.entity_id));

const processAreasForSecurity = (
  areaIds: string[],
  hass: HomeAssistant,
  entities: string[]
): LovelaceCardConfig[] => {
  const cards: LovelaceCardConfig[] = [];

  for (const areaId of areaIds) {
    const area = hass.areas[areaId];
    if (!area) continue;

    const areaFilter = generateEntityFilter(hass, {
      area: area.area_id,
    });
    const areaSecurityEntities = entities.filter(areaFilter);
    const areaCards: LovelaceCardConfig[] = [];

    const computeTileCard = computeAreaTileCardConfig(hass, "", false);

    for (const entityId of areaSecurityEntities) {
      areaCards.push(computeTileCard(entityId));
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
  entities: string[]
): LovelaceCardConfig[] => {
  const unassignedFilter = generateEntityFilter(hass, {
    area: null,
  });
  const unassignedLights = entities.filter(unassignedFilter);
  const areaCards: LovelaceCardConfig[] = [];
  const computeTileCard = computeAreaTileCardConfig(hass, "", false);

  for (const entityId of unassignedLights) {
    areaCards.push(computeTileCard(entityId));
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

    const allEntities = Object.keys(hass.states);

    const securityFilters = securityEntityFilters.map((filter) =>
      generateEntityFilter(hass, filter)
    );

    const entities = findEntities(allEntities, securityFilters);

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

      const areaCards = processAreasForSecurity(areaIds, hass, entities);

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
        entities
      );

      if (areaCards.length > 0) {
        section.cards!.push(...areaCards);
        sections.push(section);
      }
    }

    // Process unassigned entities
    const unassignedCards = processUnassignedEntities(hass, entities);

    if (unassignedCards.length > 0) {
      const section: LovelaceSectionRawConfig = {
        type: "grid",
        column_span: 2,
        cards: [
          {
            type: "heading",
            heading:
              sections.length > 0
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

    // Build sidebar with activity log
    const hasLogbook = isComponentLoaded(hass.config, "logbook");

    // Collect person entity IDs
    const personEntities = Object.keys(hass.states).filter(
      (entityId) => computeStateDomain(hass.states[entityId]) === "person"
    );

    const logbookEntityIds = [...entities, ...personEntities];

    const sidebarSections: LovelaceSectionConfig[] = [];

    const alertCards = config.alert_entities?.map((alertEntity) =>
      computeSecurityAlertCardConfig(
        hass.states[alertEntity.entity],
        alertEntity
      )
    );

    if (alertCards?.length) {
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
