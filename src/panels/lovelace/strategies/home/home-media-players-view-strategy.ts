import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import {
  findEntities,
  generateEntityFilter,
} from "../../../../common/entity/entity_filter";
import { floorDefaultIcon } from "../../../../components/ha-floor-icon";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import type { MediaControlCardConfig } from "../../cards/types";
import { getAreasFloorHierarchy } from "../../../../common/areas/areas-floor-hierarchy";
import { HOME_SUMMARIES_FILTERS } from "./helpers/home-summaries";

export interface HomeMediaPlayersViewStrategyConfig {
  type: "home-media-players";
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
    const areaCards: LovelaceCardConfig[] = [];

    for (const entityId of areaEntities) {
      areaCards.push({
        type: "media-control",
        entity: entityId,
      } satisfies MediaControlCardConfig);
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

const processUnassignedEntities = (
  hass: HomeAssistant,
  entities: string[]
): LovelaceCardConfig[] => {
  const unassignedFilter = generateEntityFilter(hass, {
    area: null,
  });
  const unassignedEntities = entities.filter(unassignedFilter);
  const areaCards: LovelaceCardConfig[] = [];

  for (const entityId of unassignedEntities) {
    areaCards.push({
      type: "media-control",
      entity: entityId,
    } satisfies MediaControlCardConfig);
  }

  return areaCards;
};

@customElement("home-media-players-view-strategy")
export class HomeMMediaPlayersViewStrategy extends ReactiveElement {
  static async generate(
    _config: HomeMediaPlayersViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const areas = Object.values(hass.areas);
    const floors = Object.values(hass.floors);
    const home = getAreasFloorHierarchy(floors, areas);

    const sections: LovelaceSectionRawConfig[] = [];

    const allEntities = Object.keys(hass.states);

    const mediaPlayersFilters = HOME_SUMMARIES_FILTERS.media_players.map(
      (filter) => generateEntityFilter(hass, filter)
    );

    const entities = findEntities(allEntities, mediaPlayersFilters);

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
            icon: floor.icon || floorDefaultIcon(floor),
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

      const areaCards = processAreasForMediaPlayers(home.areas, hass, entities);

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
                    "ui.panel.lovelace.strategy.home_media_players.other_media_players"
                  )
                : hass.localize(
                    "ui.panel.lovelace.strategy.home_media_players.media_players"
                  ),
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
    "home-media-players-view-strategy": HomeMMediaPlayersViewStrategy;
  }
}
