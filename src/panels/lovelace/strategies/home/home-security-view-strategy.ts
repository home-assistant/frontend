import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import {
  findEntities,
  generateEntityFilter,
} from "../../../../common/entity/entity_filter";
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
import { HOME_SUMMARIES_FILTERS } from "./helpers/home-summaries";

export interface HomeSecurityViewStrategyConfig {
  type: "home-security";
}

const processAreasForSecurity = (
  areaIds: string[],
  hass: HomeAssistant,
  entities: string[]
): LovelaceCardConfig[] => {
  const cards: LovelaceCardConfig[] = [];
  const computeTileCard = computeAreaTileCardConfig(hass, "", false);

  for (const areaId of areaIds) {
    const area = hass.areas[areaId];
    if (!area) continue;

    const areaFilter = generateEntityFilter(hass, {
      area: area.area_id,
    });

    const areaEntities = entities.filter(areaFilter);
    const areaCards: LovelaceCardConfig[] = [];

    for (const entityId of areaEntities) {
      areaCards.push(computeTileCard(entityId));
    }

    if (areaEntities.length > 0) {
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

@customElement("home-security-view-strategy")
export class HomeSecurityViewStrategy extends ReactiveElement {
  static async generate(
    _config: HomeSecurityViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const areas = getAreas(hass.areas);
    const floors = getFloors(hass.floors);
    const home = getHomeStructure(floors, areas);

    const sections: LovelaceSectionRawConfig[] = [];

    const allEntities = Object.keys(hass.states);

    const securityFilters = HOME_SUMMARIES_FILTERS.security.map((filter) =>
      generateEntityFilter(hass, filter)
    );

    const entities = findEntities(allEntities, securityFilters);

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

      const areaCards = processAreasForSecurity(areaIds, hass, entities);

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

      const areaCards = processAreasForSecurity(home.areas, hass, entities);

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
    "home-security-view-strategy": HomeSecurityViewStrategy;
  }
}
