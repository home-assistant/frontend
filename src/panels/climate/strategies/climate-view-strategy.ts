import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import {
  findEntities,
  generateEntityFilter,
  type EntityFilter,
} from "../../../common/entity/entity_filter";
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

export interface ClimateViewStrategyConfig {
  type: "climate";
}

export const climateEntityFilters: EntityFilter[] = [
  { domain: "climate", entity_category: "none" },
  { domain: "humidifier", entity_category: "none" },
  { domain: "fan", entity_category: "none" },
  { domain: "water_heater", entity_category: "none" },
  {
    domain: "cover",
    device_class: [
      "awning",
      "blind",
      "curtain",
      "shade",
      "shutter",
      "window",
      "none",
    ],
    entity_category: "none",
  },
  {
    domain: "binary_sensor",
    device_class: ["window"],
    entity_category: "none",
  },
];

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
    const areaClimateEntities = entities.filter(areaFilter);
    const areaCards: LovelaceCardConfig[] = [];

    // Add temperature and humidity sensors with trend graphs for areas
    const temperatureEntityId = area.temperature_entity_id;
    if (temperatureEntityId && hass.states[temperatureEntityId]) {
      areaCards.push({
        ...computeTileCard(temperatureEntityId),
        features: [{ type: "trend-graph" }],
      });
    }

    const humidityEntityId = area.humidity_entity_id;
    if (humidityEntityId && hass.states[humidityEntityId]) {
      areaCards.push({
        ...computeTileCard(humidityEntityId),
        features: [{ type: "trend-graph" }],
      });
    }

    // Add other climate entities
    for (const entityId of areaClimateEntities) {
      // Skip if already added as temperature/humidity sensor
      if (entityId === temperatureEntityId || entityId === humidityEntityId) {
        continue;
      }

      const state = hass.states[entityId];
      if (
        state?.attributes.device_class === "temperature" ||
        state?.attributes.device_class === "humidity"
      ) {
        areaCards.push({
          ...computeTileCard(entityId),
          features: [{ type: "trend-graph" }],
        });
      } else {
        areaCards.push(computeTileCard(entityId));
      }
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

@customElement("climate-view-strategy")
export class ClimateViewStrategy extends ReactiveElement {
  static async generate(
    _config: ClimateViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const areas = getAreas(hass.areas);
    const floors = getFloors(hass.floors);
    const home = getHomeStructure(floors, areas);

    const sections: LovelaceSectionRawConfig[] = [];

    const allEntities = Object.keys(hass.states);

    const climateFilters = climateEntityFilters.map((filter) =>
      generateEntityFilter(hass, filter)
    );

    const entities = findEntities(allEntities, climateFilters);

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
    "climate-view-strategy": ClimateViewStrategy;
  }
}
