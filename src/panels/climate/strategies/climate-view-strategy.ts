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
import { floorDefaultIcon } from "../../../components/ha-floor-icon";

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

const processUnassignedEntities = (
  hass: HomeAssistant,
  entities: string[]
): LovelaceCardConfig[] => {
  const unassignedFilter = generateEntityFilter(hass, {
    area: null,
  });
  const unassignedEntities = entities.filter(unassignedFilter);
  const areaCards: LovelaceCardConfig[] = [];
  const computeTileCard = computeAreaTileCardConfig(hass, "", true);

  for (const entityId of unassignedEntities) {
    areaCards.push(computeTileCard(entityId));
  }

  return areaCards;
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

    // Find single heating thermostat
    const heatingThermostats = allEntities.filter((entityId) => {
      const state = hass.states[entityId];
      if (!state || !entityId.startsWith("climate.")) return false;
      const hvacModes = state.attributes.hvac_modes || [];
      return hvacModes.includes("heat") || hvacModes.includes("heat_cool");
    });

    // Find single weather entity
    const weatherEntities = allEntities.filter((entityId) =>
      entityId.startsWith("weather.")
    );

    // Add thermostat graph at top if there's exactly one heating thermostat
    if (heatingThermostats.length === 1) {
      const thermostatId = heatingThermostats[0];
      const graphCards: LovelaceCardConfig[] = [
        {
          type: "thermostat",
          entity: thermostatId,
          features: [{ type: "trend-graph", hours_to_show: 24 }],
        },
      ];

      // Add weather card if there's exactly one weather entity
      if (weatherEntities.length === 1) {
        graphCards.push({
          type: "weather-forecast",
          entity: weatherEntities[0],
          show_current: true,
          show_forecast: true,
        });
      }

      const graphSection: LovelaceSectionRawConfig = {
        type: "grid",
        column_span: 2,
        cards: graphCards,
      };

      sections.push(graphSection);
    }

    // Collect all temperature sensors from areas
    const temperatureSensors: string[] = [];
    for (const area of Object.values(hass.areas)) {
      if (area.temperature_entity_id && hass.states[area.temperature_entity_id]) {
        temperatureSensors.push(area.temperature_entity_id);
      }
    }

    // Add entities card for room temperatures if there are any
    if (temperatureSensors.length > 0) {
      const entitiesSection: LovelaceSectionRawConfig = {
        type: "grid",
        column_span: 2,
        cards: [
          {
            type: "entities",
            title: hass.localize(
              "ui.panel.lovelace.strategy.climate.room_temperatures"
            ),
            entities: temperatureSensors,
            state_color: false,
          },
        ],
      };
      sections.push(entitiesSection);
    }

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
                    "ui.panel.lovelace.strategy.climate.other_devices"
                  )
                : hass.localize("ui.panel.lovelace.strategy.climate.devices"),
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
    "climate-view-strategy": ClimateViewStrategy;
  }
}
