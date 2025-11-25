import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import {
  findEntities,
  generateEntityFilter,
} from "../../../../common/entity/entity_filter";
import { floorDefaultIcon } from "../../../../components/ha-floor-icon";
import type { AreaRegistryEntry } from "../../../../data/area_registry";
import { getEnergyPreferences } from "../../../../data/energy";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type {
  LovelaceSectionConfig,
  LovelaceSectionRawConfig,
  LovelaceStrategySectionConfig,
} from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import type {
  AreaCardConfig,
  HomeSummaryCard,
  MarkdownCardConfig,
  WeatherForecastCardConfig,
} from "../../cards/types";
import type { CommonControlSectionStrategyConfig } from "../usage_prediction/common-controls-section-strategy";
import { getAreasFloorHierarchy } from "../../../../common/areas/areas-floor-hierarchy";
import { HOME_SUMMARIES_FILTERS } from "./helpers/home-summaries";

export interface HomeOverviewViewStrategyConfig {
  type: "home-overview";
  favorite_entities?: string[];
}

const computeAreaCard = (
  areaId: string,
  hass: HomeAssistant
): AreaCardConfig => {
  const area = hass.areas[areaId] as AreaRegistryEntry | undefined;
  const path = `areas-${areaId}`;

  const sensorClasses: string[] = [];
  if (area?.temperature_entity_id) {
    sensorClasses.push("temperature");
  }

  return {
    type: "area",
    area: areaId,
    display_type: "compact",
    sensor_classes: sensorClasses,
    navigation_path: path,
    vertical: true,
    grid_options: {
      rows: 2,
      columns: 4,
    },
  };
};

@customElement("home-overview-view-strategy")
export class HomeOverviewViewStrategy extends ReactiveElement {
  static async generate(
    config: HomeOverviewViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const areas = Object.values(hass.areas);
    const floors = Object.values(hass.floors);

    const home = getAreasFloorHierarchy(floors, areas);

    const floorCount = home.floors.length + (home.areas.length ? 1 : 0);

    // Allow between 2 and 3 columns (the max should be set to define the width of the header)
    const maxColumns = 2;

    const floorsSections: LovelaceSectionConfig[] = [];
    for (const floorStructure of home.floors) {
      const floorId = floorStructure.id;
      const areaIds = floorStructure.areas;
      const floor = hass.floors[floorId];

      const cards: LovelaceCardConfig[] = [];
      for (const areaId of areaIds) {
        cards.push(computeAreaCard(areaId, hass));
      }

      if (cards.length) {
        floorsSections.push({
          type: "grid",
          column_span: maxColumns,
          cards: [
            {
              type: "heading",
              heading:
                floorCount > 1
                  ? floor.name
                  : hass.localize("ui.panel.lovelace.strategy.home.areas"),
              heading_style: "title",
              icon: floor.icon || floorDefaultIcon(floor),
            },
            ...cards,
          ],
        });
      }
    }

    if (home.areas.length) {
      const cards: LovelaceCardConfig[] = [];
      for (const areaId of home.areas) {
        cards.push(computeAreaCard(areaId, hass));
      }
      floorsSections.push({
        type: "grid",
        column_span: maxColumns,
        cards: [
          {
            type: "heading",
            heading:
              floorCount > 1
                ? hass.localize("ui.panel.lovelace.strategy.home.other_areas")
                : hass.localize("ui.panel.lovelace.strategy.home.areas"),
            heading_style: "title",
          },
          ...cards,
        ],
      });
    }

    const favoriteSection: LovelaceSectionConfig = {
      type: "grid",
      column_span: maxColumns,
      cards: [],
    };

    const favoriteEntities = (config.favorite_entities || []).filter(
      (entityId) => hass.states[entityId] !== undefined
    );
    const maxCommonControls = Math.max(8, favoriteEntities.length);

    const commonControlsSection = {
      strategy: {
        type: "common-controls",
        limit: maxCommonControls,
        include_entities: favoriteEntities,
        hide_empty: true,
      } satisfies CommonControlSectionStrategyConfig,
      column_span: maxColumns,
    } as LovelaceStrategySectionConfig;

    const allEntities = Object.keys(hass.states);

    const mediaPlayerFilter = HOME_SUMMARIES_FILTERS.media_players.map(
      (filter) => generateEntityFilter(hass, filter)
    );

    const lightsFilters = HOME_SUMMARIES_FILTERS.light.map((filter) =>
      generateEntityFilter(hass, filter)
    );

    const climateFilters = HOME_SUMMARIES_FILTERS.climate.map((filter) =>
      generateEntityFilter(hass, filter)
    );

    const securityFilters = HOME_SUMMARIES_FILTERS.security.map((filter) =>
      generateEntityFilter(hass, filter)
    );

    const hasLights = findEntities(allEntities, lightsFilters).length > 0;
    const hasMediaPlayers =
      findEntities(allEntities, mediaPlayerFilter).length > 0;
    const hasClimate = findEntities(allEntities, climateFilters).length > 0;
    const hasSecurity = findEntities(allEntities, securityFilters).length > 0;

    const summaryCards: LovelaceCardConfig[] = [
      hasLights &&
        ({
          type: "home-summary",
          summary: "light",
          vertical: true,
          tap_action: {
            action: "navigate",
            navigation_path: "/light?historyBack=1",
          },
          grid_options: {
            rows: 2,
            columns: 4,
          },
        } satisfies HomeSummaryCard),
      hasClimate &&
        ({
          type: "home-summary",
          summary: "climate",
          vertical: true,
          tap_action: {
            action: "navigate",
            navigation_path: "/climate?historyBack=1",
          },
          grid_options: {
            rows: 2,
            columns: 4,
          },
        } satisfies HomeSummaryCard),
      hasSecurity &&
        ({
          type: "home-summary",
          summary: "security",
          vertical: true,
          tap_action: {
            action: "navigate",
            navigation_path: "/security?historyBack=1",
          },
          grid_options: {
            rows: 2,
            columns: 4,
          },
        } satisfies HomeSummaryCard),
      hasMediaPlayers &&
        ({
          type: "home-summary",
          summary: "media_players",
          vertical: true,
          tap_action: {
            action: "navigate",
            navigation_path: "media-players",
          },
          grid_options: {
            rows: 2,
            columns: 4,
          },
        } satisfies HomeSummaryCard),
    ].filter(Boolean) as LovelaceCardConfig[];

    const summarySection: LovelaceSectionConfig = {
      type: "grid",
      column_span: maxColumns,
      cards: [],
    };

    if (summaryCards.length) {
      summarySection.cards!.push(
        {
          type: "heading",
          heading: hass.localize("ui.panel.lovelace.strategy.home.summaries"),
        },
        ...summaryCards
      );
    }

    const weatherFilter = generateEntityFilter(hass, {
      domain: "weather",
      entity_category: "none",
    });

    const widgetSection: LovelaceSectionConfig = {
      type: "grid",
      column_span: maxColumns,
      cards: [],
    };
    const weatherEntity = Object.keys(hass.states)
      .filter(weatherFilter)
      .sort()[0];

    if (weatherEntity) {
      widgetSection.cards!.push(
        {
          type: "heading",
          heading: "",
          heading_style: "subtitle",
        },
        {
          type: "weather-forecast",
          entity: weatherEntity,
          forecast_type: "daily",
        } as WeatherForecastCardConfig
      );
    }

    const energyPrefs = isComponentLoaded(hass, "energy")
      ? // It raises if not configured, just swallow that.
        await getEnergyPreferences(hass).catch(() => undefined)
      : undefined;

    if (energyPrefs) {
      const grid = energyPrefs.energy_sources.find(
        (source) => source.type === "grid"
      );

      if (grid && grid.flow_from.length > 0) {
        widgetSection.cards!.push({
          title: hass.localize(
            "ui.panel.lovelace.cards.energy.energy_distribution.title_today"
          ),
          type: "energy-distribution",
          collection_key: "energy_home_dashboard",
          link_dashboard: true,
        });
      }
    }

    const sections = (
      [
        favoriteSection.cards && favoriteSection,
        commonControlsSection,
        summarySection.cards && summarySection,
        ...floorsSections,
        widgetSection.cards && widgetSection,
      ] satisfies (LovelaceSectionRawConfig | undefined)[]
    ).filter(Boolean) as LovelaceSectionRawConfig[];

    return {
      type: "sections",
      max_columns: maxColumns,
      sections: sections,
      header: {
        layout: "responsive",
        card: {
          type: "markdown",
          text_only: true,
          content: `## ${hass.localize("ui.panel.lovelace.strategy.home.welcome_user", { user: "{{ user }}" })}`,
        } satisfies MarkdownCardConfig,
      },
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-overview-view-strategy": HomeOverviewViewStrategy;
  }
}
