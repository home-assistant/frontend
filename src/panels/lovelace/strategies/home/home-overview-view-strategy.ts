import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { getAreasFloorHierarchy } from "../../../../common/areas/areas-floor-hierarchy";
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
  TileCardConfig,
} from "../../cards/types";
import type { CommonControlSectionStrategyConfig } from "../usage_prediction/common-controls-section-strategy";
import { HOME_SUMMARIES_FILTERS } from "./helpers/home-summaries";
import type { Condition } from "../../common/validate-condition";

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

    const maxColumns = 3;

    const largeScreenCondition: Condition = {
      condition: "screen",
      media_query: "(min-width: 871px)",
    };

    const smallScreenCondition: Condition = {
      condition: "screen",
      media_query: "(max-width: 870px)",
    };

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

    const favoriteEntities = (config.favorite_entities || []).filter(
      (entityId) => hass.states[entityId] !== undefined
    );
    const maxCommonControls = Math.max(8, favoriteEntities.length);

    const commonControlsSectionBase = {
      strategy: {
        type: "common-controls",
        limit: maxCommonControls,
        include_entities: favoriteEntities,
        hide_empty: true,
      } satisfies CommonControlSectionStrategyConfig,
      column_span: maxColumns,
    } as LovelaceStrategySectionConfig;

    const commonControlsSectionMobile = {
      ...commonControlsSectionBase,
      strategy: {
        ...commonControlsSectionBase.strategy,
        title: hass.localize("ui.panel.lovelace.strategy.home.commonly_used"),
      },
      visibility: [smallScreenCondition],
    } as LovelaceStrategySectionConfig;

    const commonControlsSectionDesktop = {
      ...commonControlsSectionBase,
      visibility: [largeScreenCondition],
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

    const weatherFilter = generateEntityFilter(hass, {
      domain: "weather",
      entity_category: "none",
    });

    const weatherEntity = Object.keys(hass.states)
      .filter(weatherFilter)
      .sort()[0];

    const energyPrefs = isComponentLoaded(hass, "energy")
      ? // It raises if not configured, just swallow that.
        await getEnergyPreferences(hass).catch(() => undefined)
      : undefined;

    const hasEnergy =
      energyPrefs?.energy_sources.some(
        (source) => source.type === "grid" && source.flow_from.length > 0
      ) ?? false;

    // Build summary cards (used in both mobile section and sidebar)
    const summaryCards: LovelaceCardConfig[] = [
      hasLights &&
        ({
          type: "home-summary",
          summary: "light",
          tap_action: {
            action: "navigate",
            navigation_path: "/light?historyBack=1",
          },
        } satisfies HomeSummaryCard),
      hasClimate &&
        ({
          type: "home-summary",
          summary: "climate",
          tap_action: {
            action: "navigate",
            navigation_path: "/climate?historyBack=1",
          },
        } satisfies HomeSummaryCard),
      hasSecurity &&
        ({
          type: "home-summary",
          summary: "security",
          tap_action: {
            action: "navigate",
            navigation_path: "/security?historyBack=1",
          },
        } satisfies HomeSummaryCard),
      hasMediaPlayers &&
        ({
          type: "home-summary",
          summary: "media_players",
          tap_action: {
            action: "navigate",
            navigation_path: "media-players",
          },
        } satisfies HomeSummaryCard),
      weatherEntity &&
        ({
          type: "tile",
          entity: weatherEntity,
          name: hass.localize(
            "ui.panel.lovelace.strategy.home.summary_list.weather"
          ),
          state_content: ["temperature", "state"],
        } satisfies TileCardConfig),
      hasEnergy &&
        ({
          type: "home-summary",
          summary: "energy",
          tap_action: {
            action: "navigate",
            navigation_path: "/energy?historyBack=1",
          },
        } satisfies HomeSummaryCard),
    ].filter(Boolean) as LovelaceCardConfig[];

    // Build summary cards for sidebar (full width: columns 12)
    const sidebarSummaryCards = summaryCards.map((card) => ({
      ...card,
      grid_options: { columns: 12 },
    }));

    // Build summary cards for mobile section (half width: columns 6)
    const mobileSummaryCards = summaryCards.map((card) => ({
      ...card,
      grid_options: { columns: 6 },
    }));

    // Mobile summary section (visible on small screens only)
    const mobileSummarySection: LovelaceSectionConfig | undefined =
      mobileSummaryCards.length > 0
        ? {
            type: "grid",
            column_span: maxColumns,
            visibility: [smallScreenCondition],
            cards: mobileSummaryCards,
          }
        : undefined;

    // Sidebar section
    const sidebarSection: LovelaceSectionConfig | undefined =
      sidebarSummaryCards.length > 0
        ? {
            type: "grid",
            cards: [
              {
                type: "heading",
                heading: hass.localize(
                  "ui.panel.lovelace.strategy.home.for_you"
                ),
                heading_style: "title",
              },
              ...sidebarSummaryCards,
            ],
          }
        : undefined;

    const sections = (
      [
        {
          type: "grid",
          cards: [
            // Heading to add some spacing on large screens
            {
              type: "heading",
              heading_style: "subtitle",
              visibility: [largeScreenCondition],
            },
          ],
        },
        mobileSummarySection,
        commonControlsSectionMobile,
        commonControlsSectionDesktop,
        ...floorsSections,
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
      ...(sidebarSection && {
        sidebar: {
          sections: [sidebarSection],
          content_label: hass.localize("ui.panel.lovelace.strategy.home.home"),
          sidebar_label: hass.localize(
            "ui.panel.lovelace.strategy.home.for_you"
          ),
          visibility: [largeScreenCondition],
        },
      }),
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-overview-view-strategy": HomeOverviewViewStrategy;
  }
}
