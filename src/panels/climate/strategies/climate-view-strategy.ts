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
import { computeAreaTileCardConfig } from "../../lovelace/strategies/areas/helpers/areas-strategy-helper";
import type { EntityConfig } from "../lovelace/entity-rows/types";

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

export const temperatureSensorFilter: EntityFilter = {
  domain: "sensor",
  device_class: "temperature",
  entity_category: "none",
};

@customElement("climate-view-strategy")
export class ClimateViewStrategy extends ReactiveElement {
  static async generate(
    _config: ClimateViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const sections: LovelaceSectionRawConfig[] = [];
    const allEntities = Object.keys(hass.states);

    // Find temperature sensors
    const tempFilter = generateEntityFilter(hass, temperatureSensorFilter);
    const temperatureSensors = allEntities.filter(tempFilter);

    // Find climate entities
    const climateFilter = generateEntityFilter(hass, {
      domain: "climate",
      entity_category: "none",
    });
    const climateEntities = allEntities.filter(climateFilter);

    // Temperatures Section
    if (temperatureSensors.length > 0) {
      const temperatureCards: LovelaceCardConfig[] = [
        {
          type: "heading",
          heading: hass.localize("ui.panel.lovelace.strategy.climate.temperatures"),
        },
      ];

      // Entities card with all temperature sensors
      const entitiesConfig: EntityConfig[] = temperatureSensors.map((entityId) => {
        const state = hass.states[entityId];
        const areaId = hass.entities[entityId]?.area_id;
        const area = areaId ? hass.areas[areaId] : null;

        return {
          entity: entityId,
          name: area ? area.name : state?.attributes.friendly_name,
        };
      });

      temperatureCards.push({
        type: "entities",
        entities: entitiesConfig,
      });

      // Statistics graph for temperature trends (limit to first 10 sensors for performance)
      if (temperatureSensors.length > 0) {
        const graphEntities = temperatureSensors.slice(0, 10).map((entityId) => {
          const state = hass.states[entityId];
          const areaId = hass.entities[entityId]?.area_id;
          const area = areaId ? hass.areas[areaId] : null;

          return {
            entity: entityId,
            name: area ? area.name : state?.attributes.friendly_name,
          };
        });

        temperatureCards.push({
          type: "statistics-graph",
          chart_type: "line",
          period: "hour",
          stat_types: ["mean", "min", "max"],
          days_to_show: 0.35,
          hide_legend: false,
          entities: graphEntities,
        });
      }

      sections.push({
        type: "grid",
        cards: temperatureCards,
      });
    }

    // Heating Section
    if (climateEntities.length > 0) {
      const heatingCards: LovelaceCardConfig[] = [
        {
          type: "heading",
          heading: hass.localize("ui.panel.lovelace.strategy.climate.heating"),
        },
      ];

      // Add thermostat cards for each climate entity
      for (const entityId of climateEntities) {
        heatingCards.push({
          type: "thermostat",
          entity: entityId,
          features: [
            {
              type: "climate-hvac-modes",
            },
          ],
        });

        // Add sensor tile for current temperature if available
        const state = hass.states[entityId];
        if (state?.attributes.current_temperature !== undefined) {
          heatingCards.push({
            type: "sensor",
            entity: entityId,
            graph: "line",
            detail: 2,
            name: hass.localize("ui.panel.lovelace.strategy.climate.current_temperature"),
          });
        }
      }

      // History graph showing climate entities and temperature sensors
      const historyEntities = [
        ...climateEntities.slice(0, 5),
        ...temperatureSensors.slice(0, 5),
      ];

      if (historyEntities.length > 0) {
        heatingCards.push({
          type: "heading",
          heading: hass.localize("ui.panel.lovelace.strategy.climate.history"),
        });

        heatingCards.push({
          type: "history-graph",
          entities: historyEntities.map((entityId) => ({ entity: entityId })),
          title: hass.localize("ui.panel.lovelace.strategy.climate.climate_history"),
          show_names: false,
        });
      }

      sections.push({
        type: "grid",
        cards: heatingCards,
      });
    }

    // Fallback: if no temperature or climate entities found, show all climate-related devices
    if (sections.length === 0) {
      const climateFilters = climateEntityFilters.map((filter) =>
        generateEntityFilter(hass, filter)
      );
      const entities = findEntities(allEntities, climateFilters);

      if (entities.length > 0) {
        const computeTileCard = computeAreaTileCardConfig(hass, "", true);
        const cards: LovelaceCardConfig[] = [
          {
            type: "heading",
            heading: hass.localize("ui.panel.lovelace.strategy.climate.devices"),
          },
        ];

        for (const entityId of entities) {
          cards.push(computeTileCard(entityId));
        }

        sections.push({
          type: "grid",
          column_span: 2,
          cards,
        });
      }
    }

    return {
      type: "sections",
      max_columns: 4,
      sections: sections,
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "climate-view-strategy": ClimateViewStrategy;
  }
}
