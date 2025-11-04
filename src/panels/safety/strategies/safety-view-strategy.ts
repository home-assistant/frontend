import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
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
import {
  computeAreaTileCardConfig,
  getAreas,
  getFloors,
} from "../../lovelace/strategies/areas/helpers/areas-strategy-helper";
import { getHomeStructure } from "../../lovelace/strategies/home/helpers/home-structure";

export interface SafetyViewStrategyConfig {
  type: "safety";
}

export const safetyEntityFilters: EntityFilter[] = [
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
    device_class: ["door", "garage", "gate"],
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

const processAreasForSafety = (
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
    const areaSafetyEntities = entities.filter(areaFilter);
    const areaCards: LovelaceCardConfig[] = [];

    const computeTileCard = computeAreaTileCardConfig(hass, "", false);

    for (const entityId of areaSafetyEntities) {
      areaCards.push(computeTileCard(entityId));
    }

    if (areaCards.length > 0) {
      cards.push({
        heading_style: "subtitle",
        type: "heading",
        heading: area.name,
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

@customElement("safety-view-strategy")
export class SafetyViewStrategy extends ReactiveElement {
  static async generate(
    _config: SafetyViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const areas = getAreas(hass.areas);
    const floors = getFloors(hass.floors);
    const home = getHomeStructure(floors, areas);

    const sections: LovelaceSectionRawConfig[] = [];

    const allEntities = Object.keys(hass.states);

    const safetyFilters = safetyEntityFilters.map((filter) =>
      generateEntityFilter(hass, filter)
    );

    const entities = findEntities(allEntities, safetyFilters);

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

      const areaCards = processAreasForSafety(areaIds, hass, entities);

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

      const areaCards = processAreasForSafety(home.areas, hass, entities);

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
                    "ui.panel.lovelace.strategy.safety.other_devices"
                  )
                : hass.localize("ui.panel.lovelace.strategy.safety.devices"),
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
    "safety-view-strategy": SafetyViewStrategy;
  }
}
