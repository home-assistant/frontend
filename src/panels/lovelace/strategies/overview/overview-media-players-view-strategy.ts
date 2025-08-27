import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { generateEntityFilter } from "../../../../common/entity/entity_filter";
import { clamp } from "../../../../common/number/clamp";
import { floorDefaultIcon } from "../../../../components/ha-floor-icon";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import type { MediaControlCardConfig } from "../../cards/types";
import { getAreas, getFloors } from "../areas/helpers/areas-strategy-helper";
import { getHomeStructure } from "./helpers/overview-home-structure";
import {
  findEntities,
  OVERVIEW_SUMMARIES_FILTERS,
} from "./helpers/overview-summaries";

export interface OvervieMediaPlayersViewStrategyConfig {
  type: "overview-media-players";
}

const processAreasForMediaPlayers = (
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
    const areaEntities = entities.filter(areaFilter);

    if (areaEntities.length > 0) {
      cards.push({
        heading_style: "subtitle",
        type: "heading",
        heading: area.name,
        icon: area.icon || "mdi:home",
        tap_action: {
          action: "navigate",
          navigation_path: `areas-${area.area_id}`,
        },
      });

      for (const entityId of areaEntities) {
        cards.push({
          type: "media-control",
          entity: entityId,
        } satisfies MediaControlCardConfig);
      }
    }
  }

  return cards;
};

@customElement("overview-media-players-view-strategy")
export class OverviewMediaPlayersViewStrategy extends ReactiveElement {
  static async generate(
    _config: OvervieMediaPlayersViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const areas = getAreas(hass.areas);
    const floors = getFloors(hass.floors);
    const home = getHomeStructure(floors, areas);

    const sections: LovelaceSectionRawConfig[] = [];

    const allEntities = Object.keys(hass.states);

    const filterFunctions = OVERVIEW_SUMMARIES_FILTERS.media_players.map(
      (filter) => generateEntityFilter(hass, filter)
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
        cards: [
          {
            type: "heading",
            heading: floorCount > 1 ? floor.name : "Areas",
            icon: floor.icon || floorDefaultIcon(floor) || "mdi:home-floor",
          },
        ],
      };

      const areaCards = processAreasForMediaPlayers(areaIds, hass, entities);

      if (areaCards.length > 0) {
        section.cards!.push(...areaCards);
        sections.push(section);
      }
    }

    // Process unassigned areas
    if (home.areas.length > 0) {
      const section: LovelaceSectionRawConfig = {
        type: "grid",
        cards: [
          {
            type: "heading",
            heading: floorCount > 1 ? "Other areas" : "Areas",
            icon: "mdi:home",
          },
        ],
      };

      const areaCards = processAreasForMediaPlayers(home.areas, hass, entities);

      if (areaCards.length > 0) {
        section.cards!.push(...areaCards);
        sections.push(section);
      }
    }

    // Allow between 2 and 3 columns (the max should be set to define the width of the header)
    const maxColumns = clamp(sections.length, 2, 3);

    // Take the full width if there is only one section to avoid narrow header on desktop
    if (sections.length === 1) {
      sections[0].column_span = 2;
    }

    return {
      type: "sections",
      max_columns: maxColumns,
      sections: sections || [],
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "overview-media-players-view-strategy": OverviewMediaPlayersViewStrategy;
  }
}
