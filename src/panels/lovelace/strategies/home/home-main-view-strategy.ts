import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { AreaRegistryEntry } from "../../../../data/area_registry";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import type {
  AreaCardConfig,
  ButtonCardConfig,
  MarkdownCardConfig,
  TileCardConfig,
  WeatherForecastCardConfig,
} from "../../cards/types";
import { getAreas } from "../areas/helpers/areas-strategy-helper";
import { HOME_SUMMARIES_ICONS } from "./helpers/home-summaries";
import { generateEntityFilter } from "../../../../common/entity/entity_filter";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { getEnergyPreferences } from "../../../../data/energy";

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
          heading: "Areas",
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
            }) as TileCardConfig
        )
      );
    }

    const summarySection: LovelaceSectionConfig = {
      type: "grid",
      column_span: maxColumns,
      cards: [
        {
          type: "heading",
          heading: "Summaries",
        },
        {
          type: "button",
          icon: HOME_SUMMARIES_ICONS.lights,
          name: "Lights",
          icon_height: "24px",
          grid_options: {
            rows: 2,
            columns: 4,
          },
          tap_action: {
            action: "navigate",
            navigation_path: "lights",
          },
        } satisfies ButtonCardConfig,
        {
          type: "button",
          icon: HOME_SUMMARIES_ICONS.climate,
          name: "Climate",
          icon_height: "30px",
          grid_options: {
            rows: 2,
            columns: 4,
          },
          tap_action: {
            action: "navigate",
            navigation_path: "climate",
          },
        } satisfies ButtonCardConfig,
        {
          type: "button",
          icon: HOME_SUMMARIES_ICONS.security,
          name: "Security",
          icon_height: "30px",
          grid_options: {
            rows: 2,
            columns: 4,
          },
          tap_action: {
            action: "navigate",
            navigation_path: "security",
          },
        } satisfies ButtonCardConfig,
        {
          type: "button",
          icon: HOME_SUMMARIES_ICONS.media_players,
          name: "Media Players",
          icon_height: "30px",
          grid_options: {
            rows: 2,
            columns: 4,
          },
          tap_action: {
            action: "navigate",
            navigation_path: "media-players",
          },
        } satisfies ButtonCardConfig,
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
          link_dashboard: true,
        });
      }
    }

    const sections = [
      ...(favoriteSection.cards ? [favoriteSection] : []),
      summarySection,
      areasSection,
      ...(widgetSection.cards ? [widgetSection] : []),
    ];
    return {
      type: "sections",
      max_columns: maxColumns,
      sections: sections,
      header: {
        layout: "responsive",
        card: {
          type: "markdown",
          text_only: true,
          content: "## Welcome {{user}}",
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
