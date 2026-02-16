import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { getAreasFloorHierarchy } from "../../../common/areas/areas-floor-hierarchy";
import {
  findEntities,
  generateEntityFilter,
  type EntityFilter,
} from "../../../common/entity/entity_filter";
import { floorDefaultIcon } from "../../../components/ha-floor-icon";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceSectionRawConfig } from "../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import { computeAreaTileCardConfig } from "../../lovelace/strategies/areas/helpers/areas-strategy-helper";
import {
  LARGE_SCREEN_CONDITION,
  SMALL_SCREEN_CONDITION,
} from "../../lovelace/strategies/helpers/screen-conditions";
import type { ToggleGroupCardConfig } from "../../lovelace/cards/types";

export interface LightViewStrategyConfig {
  type: "light";
}

export const lightEntityFilters: EntityFilter[] = [
  { domain: "light", entity_category: "none" },
];

const processAreasForLight = (
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
    const areaLights = entities.filter(areaFilter);
    const areaCards: LovelaceCardConfig[] = [];

    const computeTileCard = computeAreaTileCardConfig(hass, "", false);

    for (const entityId of areaLights) {
      areaCards.push(computeTileCard(entityId));
    }

    if (areaCards.length > 0) {
      // Visibility condition: any light is on
      const anyOnCondition = {
        condition: "or" as const,
        conditions: areaLights.map((entityId) => ({
          condition: "state" as const,
          entity: entityId,
          state: "on",
        })),
      };

      cards.push({
        heading_style: "subtitle",
        type: "heading",
        heading: area.name,
        tap_action: {
          action: "navigate",
          navigation_path: `/home/areas-${area.area_id}`,
        },
        badges: [
          // Toggle buttons for mobile
          {
            type: "button",
            icon: "mdi:power",
            tap_action: {
              action: "perform-action",
              perform_action: "light.turn_on",
              target: {
                area_id: area.area_id,
              },
            },
            visibility: [
              SMALL_SCREEN_CONDITION,
              {
                condition: "not",
                conditions: [anyOnCondition],
              },
            ],
          },
          {
            type: "button",
            icon: "mdi:power",
            color: "amber",
            tap_action: {
              action: "perform-action",
              perform_action: "light.turn_off",
              target: {
                area_id: area.area_id,
              },
            },
            visibility: [SMALL_SCREEN_CONDITION, anyOnCondition],
          },
        ] satisfies LovelaceCardConfig[],
      });

      // Toggle group card for desktop
      cards.push({
        type: "toggle-group",
        title: hass.localize("ui.panel.lovelace.strategy.light.all_lights"),
        color: "amber",
        entities: areaLights,
        visibility: [LARGE_SCREEN_CONDITION],
        grid_options: {
          columns: 6,
          rows: 1,
          min_columns: 6,
        },
      } as ToggleGroupCardConfig);

      cards.push(...areaCards);
    }
  }

  return cards;
};

const processUnassignedLights = (
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

@customElement("light-view-strategy")
export class LightViewStrategy extends ReactiveElement {
  static async generate(
    _config: LightViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const areas = Object.values(hass.areas);
    const floors = Object.values(hass.floors);
    const hierarchy = getAreasFloorHierarchy(floors, areas);

    const sections: LovelaceSectionRawConfig[] = [];

    const allEntities = Object.keys(hass.states);

    const lightFilters = lightEntityFilters.map((filter) =>
      generateEntityFilter(hass, filter)
    );

    const entities = findEntities(allEntities, lightFilters);

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

      const areaCards = processAreasForLight(areaIds, hass, entities);

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

      const areaCards = processAreasForLight(hierarchy.areas, hass, entities);

      if (areaCards.length > 0) {
        section.cards!.push(...areaCards);
        sections.push(section);
      }
    }

    // Process unassigned lights
    const unassignedCards = processUnassignedLights(hass, entities);
    if (unassignedCards.length > 0) {
      const section: LovelaceSectionRawConfig = {
        type: "grid",
        column_span: 2,
        cards: [
          {
            type: "heading",
            heading:
              sections.length > 0
                ? hass.localize("ui.panel.lovelace.strategy.light.other_lights")
                : hass.localize("ui.panel.lovelace.strategy.light.lights"),
          },
          ...unassignedCards,
        ],
      };
      sections.push(section);
    }

    return {
      type: "sections",
      max_columns: 2,
      sections: sections,
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "light-view-strategy": LightViewStrategy;
  }
}
