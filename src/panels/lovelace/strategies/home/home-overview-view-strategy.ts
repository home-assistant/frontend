import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { getAreasFloorHierarchy } from "../../../../common/areas/areas-floor-hierarchy";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import {
  findEntities,
  generateEntityFilter,
} from "../../../../common/entity/entity_filter";
import { floorDefaultIcon } from "../../../../components/ha-floor-icon";
import type { AreaRegistryEntry } from "../../../../data/area/area_registry";
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
  DiscoveredDevicesCardConfig,
  EmptyStateCardConfig,
  HomeSummaryCard,
  MarkdownCardConfig,
  TileCardConfig,
} from "../../cards/types";
import type { Condition } from "../../common/validate-condition";
import type { CommonControlSectionStrategyConfig } from "../usage_prediction/common-controls-section-strategy";
import { HOME_SUMMARIES_FILTERS } from "./helpers/home-summaries";
import { OTHER_DEVICES_FILTERS } from "./helpers/other-devices-filters";

export interface HomeOverviewViewStrategyConfig {
  type: "home-overview";
  favorite_entities?: string[];
  home_panel?: boolean;
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
    tap_action: {
      action: "navigate",
      navigation_path: path,
    },
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

    const allEntities = Object.keys(hass.states);

    const largeScreenCondition: Condition = {
      condition: "screen",
      media_query: "(min-width: 871px)",
    };

    const smallScreenCondition: Condition = {
      condition: "screen",
      media_query: "(max-width: 870px)",
    };

    const otherDevicesFilters = OTHER_DEVICES_FILTERS.map((filter) =>
      generateEntityFilter(hass, filter)
    );

    const entitiesWithoutAreas = findEntities(allEntities, otherDevicesFilters);

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

    if (home.areas.length > 0 || entitiesWithoutAreas.length > 0) {
      const cards: LovelaceCardConfig[] = [];
      for (const areaId of home.areas) {
        cards.push(computeAreaCard(areaId, hass));
      }

      if (entitiesWithoutAreas.length > 0) {
        cards.push({
          type: "tile",
          entity: "zone.home", // zone entity to represent unassigned area as it always exists
          vertical: true,
          name: hass.localize("ui.panel.lovelace.strategy.home.devices"),
          icon: "mdi:devices",
          hide_state: true,
          tap_action: {
            action: "navigate",
            navigation_path: "other-devices",
          },
          grid_options: {
            rows: 2,
            columns: 4,
          },
        } as TileCardConfig);
      }

      const noOtherAreas = home.areas.length === 0;
      const noFloor = home.floors.length === 0;

      // Other areas / Areas / Others / nothing
      const heading =
        noFloor && noOtherAreas
          ? undefined
          : noFloor
            ? hass.localize("ui.panel.lovelace.strategy.home.areas")
            : noOtherAreas
              ? hass.localize("ui.panel.lovelace.strategy.home.devices")
              : hass.localize("ui.panel.lovelace.strategy.home.other_areas");

      floorsSections.push({
        type: "grid",
        column_span: maxColumns,
        cards: [
          ...(heading
            ? [
                {
                  type: "heading",
                  heading: heading,
                  heading_style: "title",
                },
              ]
            : []),
          ...cards,
        ],
      });
    }

    const favoriteEntities = (config.favorite_entities || []).filter(
      (entityId) => hass.states[entityId] !== undefined
    );
    const maxCommonControls = Math.max(8, favoriteEntities.length);

    const favoritesSection = {
      strategy: {
        type: "common-controls",
        limit: maxCommonControls,
        include_entities: favoriteEntities,
        hide_empty: true,
        heading: {
          type: "heading",
          heading: hass.localize("ui.panel.lovelace.strategy.home.favorites"),
          heading_style: "title",
          visibility: [largeScreenCondition],
          grid_options: {
            rows: "auto", // Compact style
          },
        },
      } satisfies CommonControlSectionStrategyConfig,
      column_span: maxColumns,
    } as LovelaceStrategySectionConfig;

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
      // Discovered devices card - only visible to admins, hides when empty
      {
        type: "discovered-devices",
        hide_empty: true,
      } satisfies DiscoveredDevicesCardConfig,
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
            navigation_path: config.home_panel
              ? "/energy?historyBack=1&backPath=/home"
              : "/energy?historyBack=1",
          },
        } satisfies HomeSummaryCard),
    ].filter(Boolean) as LovelaceCardConfig[];

    // Build summary cards for sidebar (full width: columns 12)
    const sidebarSummaryCards = summaryCards.map((card) => ({
      ...card,
      grid_options: { columns: 12 },
    }));

    // Build summary cards for mobile section (half width: columns 6)
    const mobileSummaryCards = [
      ...summaryCards.map((card) => ({
        ...card,
        grid_options: { columns: 6 },
      })),
    ];

    const summaryHeadingCard: LovelaceCardConfig = {
      type: "heading",
      heading: hass.localize("ui.panel.lovelace.strategy.home.summaries"),
      heading_style: "title",
    };

    // Mobile summary section (visible on small screens only)
    const mobileSummarySection: LovelaceSectionConfig | undefined =
      mobileSummaryCards.length > 0
        ? {
            type: "grid",
            column_span: maxColumns,
            visibility: [smallScreenCondition],
            cards: [summaryHeadingCard, ...mobileSummaryCards],
          }
        : undefined;

    // Sidebar section
    const sidebarSection: LovelaceSectionConfig | undefined =
      sidebarSummaryCards.length > 0
        ? {
            type: "grid",
            cards: [
              {
                ...summaryHeadingCard,
                grid_options: { rows: "auto" }, // Compact style
              },
              ...sidebarSummaryCards,
            ],
          }
        : undefined;

    // No sections, show empty state
    if (floorsSections.length === 0) {
      return {
        type: "panel",
        cards: [
          {
            type: "empty-state",
            icon: "mdi:home-assistant",
            icon_color: "primary",
            content_only: true,
            title: hass.localize(
              "ui.panel.lovelace.strategy.home.welcome_title"
            ),
            content: hass.localize(
              "ui.panel.lovelace.strategy.home.welcome_content"
            ),
            ...(config.home_panel && hass.user?.is_admin
              ? {
                  buttons: [
                    {
                      icon: "mdi:plus",
                      text: hass.localize(
                        "ui.panel.lovelace.strategy.home.welcome_add_device"
                      ),
                      appearance: "filled",
                      variant: "brand",
                      tap_action: {
                        action: "fire-dom-event",
                        home_panel: {
                          type: "add_integration",
                        },
                      },
                    },
                    {
                      icon: "mdi:home-edit",
                      text: hass.localize(
                        "ui.panel.lovelace.strategy.home.welcome_edit_areas"
                      ),
                      appearance: "plain",
                      variant: "brand",
                      tap_action: {
                        action: "navigate",
                        navigation_path: "/config/areas/dashboard",
                      },
                    },
                  ],
                }
              : {}),
          } as EmptyStateCardConfig,
        ],
      };
    }

    const sections = (
      [favoritesSection, mobileSummarySection, ...floorsSections] satisfies (
        | LovelaceSectionRawConfig
        | undefined
      )[]
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
            "ui.panel.lovelace.strategy.home.summaries"
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
