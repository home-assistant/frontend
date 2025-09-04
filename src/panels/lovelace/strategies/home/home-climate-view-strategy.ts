import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { generateEntityFilter } from "../../../../common/entity/entity_filter";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import {
  computeAreaTileCardConfig,
  getAreas,
  getFloors,
} from "../areas/helpers/areas-strategy-helper";
import { getHomeStructure } from "./helpers/home-structure";
import { findEntities, HOME_SUMMARIES_FILTERS } from "./helpers/home-summaries";

export interface HomeClimateViewStrategyConfig {
  type: "home-climate";
}

const processAreasForClimate = (
  areaIds: string[],
  hass: HomeAssistant,
  entities: string[]
): LovelaceCardConfig[] => {
  const cards: LovelaceCardConfig[] = [];
  const computeTileCard = computeAreaTileCardConfig(hass, "", true);

  for (const areaId of areaIds) {
    const area = hass.areas[areaId];
    if (!area) continue;

    const areaFilter = generateEntityFilter(hass, {
      area: area.area_id,
    });
    const areaEntities = entities.filter(areaFilter);
    const areaCards: LovelaceCardConfig[] = [];

    if (area.temperature_entity_id) {
      areaCards.push({
        ...computeTileCard(area.temperature_entity_id),
        features: [{ type: "trend-graph" }],
      });
    }

    if (area.humidity_entity_id) {
      areaCards.push({
        ...computeTileCard(area.humidity_entity_id),
        features: [{ type: "trend-graph" }],
      });
    }

    for (const entityId of areaEntities) {
      areaCards.push(computeTileCard(entityId));
    }

    if (areaCards.length > 0) {
      cards.push({
        heading_style: "subtitle",
        type: "heading",
        heading: area.name,
        tap_action: {
          action: "navigate",
          navigation_path: `areas-${area.area_id}`,
        },
      });
      cards.push(...areaCards);
    }
  }

  return cards;
};

@customElement("home-climate-view-strategy")
export class HomeClimateViewStrategy extends ReactiveElement {
  static async generate(
    _config: HomeClimateViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const areas = getAreas(hass.areas);
    const floors = getFloors(hass.floors);
    const home = getHomeStructure(floors, areas);

    const sections: LovelaceSectionRawConfig[] = [];

    const allEntities = Object.keys(hass.states);

    const filterFunctions = HOME_SUMMARIES_FILTERS.climate.map((filter) =>
      generateEntityFilter(hass, filter)
    );

    const entities = findEntities(allEntities, filterFunctions);

    const floorCount = home.floors.length + (home.areas.length ? 1 : 0);

    // Process floors
    for (const floorStructure of home.floors) {
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
          },
        ],
      };

      const areaCards = processAreasForClimate(areaIds, hass, entities);

      if (areaCards.length > 0) {
        section.cards!.push(...areaCards);
        sections.push(section);
      }
    }

    // Process unassigned areas
    if (home.areas.length > 0) {
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

      const areaCards = processAreasForClimate(home.areas, hass, entities);

      if (areaCards.length > 0) {
        section.cards!.push(...areaCards);
        sections.push(section);
      }
    }

    return {
      type: "sections",
      max_columns: 2,
      sections: sections || [],
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-climate-view-strategy": HomeClimateViewStrategy;
  }
}
