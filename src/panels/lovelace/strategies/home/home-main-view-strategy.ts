import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { generateEntityFilter } from "../../../../common/entity/entity_filter";
import type { AreaRegistryEntry } from "../../../../data/area_registry";
import { getEnergyPreferences } from "../../../../data/energy";
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
  TileCardConfig,
  WeatherForecastCardConfig,
} from "../../cards/types";
import { getAreas } from "../areas/helpers/areas-strategy-helper";

export interface HomeMainViewStrategyConfig {
  type: "home-main";
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

@customElement("home-main-view-strategy")
export class HomeMainViewStrategy extends ReactiveElement {
  static async generate(
    config: HomeMainViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const areas = getAreas(hass.areas);

    const areasSection: LovelaceSectionConfig = {
      type: "grid",
      column_span: 2,
      cards: [
        {
          type: "heading",
          heading_style: "title",
          heading: hass.localize("ui.panel.lovelace.strategy.home.areas"),
        },
        ...areas.map<AreaCardConfig>((area) =>
          computeAreaCard(area.area_id, hass)
        ),
      ],
    };

    // Allow between 2 and 3 columns (the max should be set to define the width of the header)
    const maxColumns = 2;

    const favoriteSection: LovelaceSectionConfig = {
      type: "grid",
      column_span: maxColumns,
      cards: [],
    };

    const favoriteEntities = (config.favorite_entities || []).filter(
      (entityId) => hass.states[entityId] !== undefined
    );

    if (favoriteEntities.length > 0) {
      favoriteSection.cards!.push(
        {
          type: "heading",
          heading: "",
          heading_style: "subtitle",
        },
        ...favoriteEntities.map(
          (entityId) =>
            ({
              type: "tile",
              entity: entityId,
              show_entity_picture: true,
            }) as TileCardConfig
        )
      );
    }

    const commonControlsSection = isComponentLoaded(hass, "usage_prediction")
      ? ({
          strategy: {
            type: "common-controls",
            title: "Commonly used",
            limit: 8,
            exclude_entities: favoriteEntities,
          },
          column_span: maxColumns,
        } as LovelaceStrategySectionConfig)
      : undefined;

    const summarySection: LovelaceSectionConfig = {
      type: "grid",
      column_span: maxColumns,
      cards: [
        {
          type: "heading",
          heading: hass.localize("ui.panel.lovelace.strategy.home.summaries"),
        },
        {
          type: "home-summary",
          summary: "lights",
          vertical: true,
          tap_action: {
            action: "navigate",
            navigation_path: "lights",
          },
          grid_options: {
            rows: 2,
            columns: 4,
          },
        } satisfies HomeSummaryCard,
        {
          type: "home-summary",
          summary: "climate",
          vertical: true,
          tap_action: {
            action: "navigate",
            navigation_path: "climate",
          },
          grid_options: {
            rows: 2,
            columns: 4,
          },
        } satisfies HomeSummaryCard,
        {
          type: "home-summary",
          summary: "security",
          vertical: true,
          tap_action: {
            action: "navigate",
            navigation_path: "security",
          },
          grid_options: {
            rows: 2,
            columns: 4,
          },
        } satisfies HomeSummaryCard,
        {
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
        } satisfies HomeSummaryCard,
      ],
    };

    const weatherFilter = generateEntityFilter(hass, {
      domain: "weather",
      entity_category: "none",
    });

    const widgetSection: LovelaceSectionConfig = {
      type: "grid",
      column_span: maxColumns,
      cards: [],
    };
    const weatherEntity = Object.keys(hass.states).find(weatherFilter);

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
        summarySection,
        areasSection,
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
    "home-main-view-strategy": HomeMainViewStrategy;
  }
}
