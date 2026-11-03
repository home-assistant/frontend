import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { getAreasFloorHierarchy } from "../../../common/areas/areas-floor-hierarchy";
import {
  excludeEntities,
  findFilteredEntities,
  generateEntityFilter,
  type EntityFilter,
  type EntityFilterSources,
} from "../../../common/entity/entity_filter";
import { floorDefaultIcon } from "../../../components/ha-floor-icon";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceSectionRawConfig } from "../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import { computeAreaTileCardConfig } from "../../lovelace/strategies/areas/helpers/areas-strategy-helper";
import {
  wrapEntityVisibility,
  type ComputeEntityCard,
} from "../../lovelace/strategies/helpers/entity-visibility";

export interface ClimateViewStrategyConfig {
  type: "climate";
  hidden_entities?: string[];
  edit_visibility?: boolean;
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

export const findClimateEntities = (
  sources: EntityFilterSources,
  hiddenEntities?: string[]
): string[] =>
  findFilteredEntities(sources, climateEntityFilters, hiddenEntities);

export const findClimateAreaSensors = (
  sources: EntityFilterSources,
  hiddenEntities?: string[]
): string[] =>
  excludeEntities(
    Object.values(sources.areas).flatMap((area) =>
      [area.temperature_entity_id, area.humidity_entity_id].filter(
        (entityId): entityId is string =>
          !!entityId && entityId in sources.states
      )
    ),
    hiddenEntities
  );

export const hasClimateEntities = (
  hass: HomeAssistant,
  hiddenEntities?: string[]
): boolean =>
  findClimateAreaSensors(hass, hiddenEntities).length > 0 ||
  findClimateEntities(hass, hiddenEntities).length > 0;

interface ClimateCardOptions {
  entities: string[];
  showAreaSensor: (entityId: string) => boolean;
  computeCard: ComputeEntityCard;
}

const processAreasForClimate = (
  areaIds: string[],
  hass: HomeAssistant,
  { entities, showAreaSensor, computeCard }: ClimateCardOptions
): LovelaceCardConfig[] => {
  const cards: LovelaceCardConfig[] = [];

  for (const areaId of areaIds) {
    const area = hass.areas[areaId];
    if (!area) continue;

    const areaFilter = generateEntityFilter(
      hass.states,
      hass.entities,
      hass.devices,
      hass.areas,
      hass.floors,
      {
        area: area.area_id,
      }
    );
    const areaClimateEntities = entities.filter(areaFilter);
    const areaCards: LovelaceCardConfig[] = [];

    // Add temperature and humidity sensors with trend graphs for areas
    const temperatureEntityId = area.temperature_entity_id;
    if (
      temperatureEntityId &&
      hass.states[temperatureEntityId] &&
      showAreaSensor(temperatureEntityId)
    ) {
      areaCards.push(computeCard(temperatureEntityId));
    }

    const humidityEntityId = area.humidity_entity_id;
    if (
      humidityEntityId &&
      hass.states[humidityEntityId] &&
      showAreaSensor(humidityEntityId)
    ) {
      areaCards.push(computeCard(humidityEntityId));
    }

    // Add other climate entities
    for (const entityId of areaClimateEntities) {
      // Skip if already added as temperature/humidity sensor
      if (entityId === temperatureEntityId || entityId === humidityEntityId) {
        continue;
      }

      areaCards.push(computeCard(entityId));
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
  { entities, computeCard }: ClimateCardOptions
): LovelaceCardConfig[] => {
  const unassignedFilter = generateEntityFilter(
    hass.states,
    hass.entities,
    hass.devices,
    hass.areas,
    hass.floors,
    {
      area: null,
    }
  );
  const unassignedEntities = entities.filter(unassignedFilter);
  const areaCards: LovelaceCardConfig[] = [];

  for (const entityId of unassignedEntities) {
    areaCards.push(computeCard(entityId));
  }

  return areaCards;
};

@customElement("climate-view-strategy")
export class ClimateViewStrategy extends ReactiveElement {
  static async generate(
    config: ClimateViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const areas = Object.values(hass.areas);
    const floors = Object.values(hass.floors);
    const hierarchy = getAreasFloorHierarchy(floors, areas);

    const sections: LovelaceSectionRawConfig[] = [];

    const hiddenEntities = new Set(config.hidden_entities);
    const editVisibility = Boolean(config.edit_visibility);
    const entities = findClimateEntities(
      hass,
      editVisibility ? undefined : config.hidden_entities
    );

    const areaSensorIds = new Set(findClimateAreaSensors(hass));
    const computeTileCard = computeAreaTileCardConfig(hass, true);
    const computeClimateCard = (entityId: string): LovelaceCardConfig => {
      const tileCard = computeTileCard(entityId);
      const deviceClass = hass.states[entityId]?.attributes.device_class;
      if (areaSensorIds.has(entityId)) {
        return {
          ...tileCard,
          name:
            hass.localize(
              `component.sensor.entity_component.${deviceClass}.name`
            ) || undefined,
          features: [{ type: "trend-graph" }],
        };
      }
      if (deviceClass === "temperature" || deviceClass === "humidity") {
        return { ...tileCard, features: [{ type: "trend-graph" }] };
      }
      return tileCard;
    };
    const cardOptions: ClimateCardOptions = {
      entities,
      showAreaSensor: (entityId) =>
        editVisibility || !hiddenEntities.has(entityId),
      computeCard: editVisibility
        ? wrapEntityVisibility(hiddenEntities, computeClimateCard)
        : computeClimateCard,
    };

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

      const areaCards = processAreasForClimate(areaIds, hass, cardOptions);

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

      const areaCards = processAreasForClimate(
        hierarchy.areas,
        hass,
        cardOptions
      );

      if (areaCards.length > 0) {
        section.cards!.push(...areaCards);
        sections.push(section);
      }
    }

    // Process unassigned entities
    const unassignedCards = processUnassignedEntities(hass, cardOptions);

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
