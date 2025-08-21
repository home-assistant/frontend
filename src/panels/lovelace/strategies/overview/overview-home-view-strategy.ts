import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { clamp } from "../../../../common/number/clamp";
import { floorDefaultIcon } from "../../../../components/ha-floor-icon";
import type { AreaRegistryEntry } from "../../../../data/area_registry";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import { getAreaControlEntities } from "../../card-features/hui-area-controls-card-feature";
import { AREA_CONTROLS, type AreaControl } from "../../card-features/types";
import type {
  AreaCardConfig,
  ButtonCardConfig,
  HeadingCardConfig,
  MarkdownCardConfig,
  TileCardConfig,
} from "../../cards/types";
import { getAreas, getFloors } from "../areas/helpers/areas-strategy-helper";
import { getHomeStructure } from "./helpers/overview-home-structure";
import { OVERVIEW_SUMMARIES_ICONS } from "./helpers/overview-summaries";

export interface OverviewHomeViewStrategyConfig {
  type: "overview-home";
  favorite_entities?: string[];
}

const computeAreaCard = (
  areaId: string,
  hass: HomeAssistant
): AreaCardConfig => {
  const area = hass.areas[areaId] as AreaRegistryEntry | undefined;
  const path = `areas-${areaId}`;

  const controls: AreaControl[] = AREA_CONTROLS.filter(
    (a) => a !== "switch" // Exclude switches control for areas as we don't know what the switches control
  );
  const controlEntities = getAreaControlEntities(controls, areaId, [], hass);

  const filteredControls = controls.filter(
    (control) => controlEntities[control].length > 0
  );

  const sensorClasses: string[] = [];
  if (area?.temperature_entity_id) {
    sensorClasses.push("temperature");
  }
  if (area?.humidity_entity_id) {
    sensorClasses.push("humidity");
  }

  return {
    type: "area",
    area: areaId,
    display_type: "compact",
    sensor_classes: sensorClasses,
    features: filteredControls.length
      ? [
          {
            type: "area-controls",
            controls: filteredControls,
          },
        ]
      : [],
    grid_options: {
      rows: 1,
      columns: 12,
    },
    features_position: "inline",
    navigation_path: path,
  };
};

@customElement("overview-home-view-strategy")
export class OverviewHomeViewStrategy extends ReactiveElement {
  static async generate(
    config: OverviewHomeViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const floors = getFloors(hass.floors);
    const areas = getAreas(hass.areas);

    const home = getHomeStructure(floors, areas);

    const floorCount = home.floors.length + (home.areas.length ? 1 : 0);

    const floorsSections: LovelaceSectionConfig[] = home.floors.map(
      (floorStructure) => {
        const floorId = floorStructure.id;
        const areaIds = floorStructure.areas;
        const floor = hass.floors[floorId];

        const headingCard: HeadingCardConfig = {
          type: "heading",
          heading_style: "title",
          heading: floorCount > 1 ? floor.name : "Areas",
          icon: floor.icon || floorDefaultIcon(floor),
        };

        const areasCards = areaIds.map<AreaCardConfig>((areaId) =>
          computeAreaCard(areaId, hass)
        );

        return {
          max_columns: 3,
          type: "grid",
          cards: [headingCard, ...areasCards],
        };
      }
    );

    if (home.areas.length > 0) {
      floorsSections.push({
        type: "grid",
        max_columns: 3,
        cards: [
          {
            type: "heading",
            heading_style: "title",
            icon: "mdi:home",
            heading: floorCount > 1 ? "Other areas" : "Areas",
          },
          ...home.areas.map<AreaCardConfig>((areaId) =>
            computeAreaCard(areaId, hass)
          ),
        ],
      } as LovelaceSectionConfig);
    }

    // Allow between 2 and 3 columns (the max should be set to define the width of the header)
    const maxColumns = clamp(floorsSections.length, 2, 3);

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
          heading: "Quick actions",
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
          icon: OVERVIEW_SUMMARIES_ICONS.lights,
          name: "Lights",
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
          icon: OVERVIEW_SUMMARIES_ICONS.climate,
          name: "Climate",
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
          icon: OVERVIEW_SUMMARIES_ICONS.security,
          name: "Security",
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
          icon: OVERVIEW_SUMMARIES_ICONS.media_players,
          name: "Media Players",
          grid_options: {
            rows: 2,
            columns: 4,
          },
          tap_action: {
            action: "navigate",
            navigation_path: "media-players",
          },
        } satisfies ButtonCardConfig,
        {
          type: "button",
          icon: "mdi:lightning-bolt",
          name: "Energy",
          grid_options: {
            rows: 2,
            columns: 4,
          },
          tap_action: {
            action: "navigate",
            navigation_path: "/energy?historyBack=1",
          },
        } satisfies ButtonCardConfig,
      ],
    };

    const sections = [
      ...(favoriteSection.cards ? [favoriteSection] : []),
      summarySection,
      ...floorsSections,
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
    "overview-home-view-strategy": OverviewHomeViewStrategy;
  }
}
