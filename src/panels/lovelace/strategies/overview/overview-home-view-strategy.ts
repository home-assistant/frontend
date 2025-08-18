import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { generateEntityFilter } from "../../../../common/entity/entity_filter";
import { clamp } from "../../../../common/number/clamp";
import { floorDefaultIcon } from "../../../../components/ha-floor-icon";
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
import { OVERVIEW_CATEGORIES_ICONS } from "./helpers/overview-categories";

const UNASSIGNED_FLOOR = "__unassigned__";

export interface OverviewHomeViewStrategyConfig {
  type: "overview-home";
  favorite_entities?: string[];
}

@customElement("overview-home-view-strategy")
export class OverviewHomeViewStrategy extends ReactiveElement {
  static async generate(
    config: OverviewHomeViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const displayedAreas = getAreas(hass.areas);

    const floors = getFloors(hass.floors);

    const floorSections = [
      ...floors,
      {
        floor_id: UNASSIGNED_FLOOR,
        name: hass.localize("ui.panel.lovelace.strategy.areas.other_areas"),
        level: null,
        icon: null,
      },
    ]
      .map((floor) => {
        const areasInFloors = displayedAreas.filter(
          (area) =>
            area.floor_id === floor.floor_id ||
            (!area.floor_id && floor.floor_id === UNASSIGNED_FLOOR)
        );

        return [floor, areasInFloors] as const;
      })
      .filter(([_, areas]) => areas.length)
      .map<LovelaceSectionConfig | undefined>(([floor, areas], _, array) => {
        const areasCards = areas.map<AreaCardConfig>((area) => {
          const path = `areas-${area.area_id}`;

          const controls: AreaControl[] = AREA_CONTROLS.filter(
            (a) => a !== "switch" // Exclude switches control for areas as we don't know what the switches control
          );
          const controlEntities = getAreaControlEntities(
            controls,
            area.area_id,
            [],
            hass
          );

          const filteredControls = controls.filter(
            (control) => controlEntities[control].length > 0
          );

          const sensorClasses: string[] = [];
          if (area.temperature_entity_id) {
            sensorClasses.push("temperature");
          }
          if (area.humidity_entity_id) {
            sensorClasses.push("humidity");
          }

          return {
            type: "area",
            area: area.area_id,
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
        });

        const noFloors =
          array.length === 1 && floor.floor_id === UNASSIGNED_FLOOR;

        const headingTitle = noFloors
          ? hass.localize("ui.panel.lovelace.strategy.areas.areas")
          : floor.name;

        const headingCard: HeadingCardConfig = {
          type: "heading",
          heading_style: "title",
          heading: headingTitle,
          icon: floor.icon || floorDefaultIcon(floor),
        };

        return {
          max_columns: 3,
          type: "grid",
          cards: [headingCard, ...areasCards],
        };
      })
      ?.filter((section) => section !== undefined);

    // Allow between 2 and 3 columns (the max should be set to define the width of the header)
    const maxColumns = clamp(floorSections.length, 2, 3);

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
          heading: "Favorites",
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

    const personSection: LovelaceSectionConfig = {
      type: "grid",
      column_span: maxColumns,
      cards: [],
    };

    const personFilter = generateEntityFilter(hass, {
      domain: "person",
    });

    const personEntities = Object.keys(hass.states).filter(personFilter);

    if (personEntities.length > 0) {
      personSection.cards!.push(
        {
          type: "heading",
          heading: "People",
        },
        ...personEntities.map(
          (entityId) =>
            ({
              type: "tile",
              entity: entityId,
              show_entity_picture: true,
            }) as TileCardConfig
        )
      );
    }

    const categorySection: LovelaceSectionConfig = {
      type: "grid",
      column_span: maxColumns,
      cards: [
        {
          type: "heading",
          heading: "Categories",
        },
        {
          type: "button",
          icon: OVERVIEW_CATEGORIES_ICONS.lights,
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
          icon: OVERVIEW_CATEGORIES_ICONS.climate,
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
          icon: OVERVIEW_CATEGORIES_ICONS.security,
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
      ...(personSection.cards ? [personSection] : []),
      categorySection,
      ...floorSections,
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
          content: "## Welcome {{user}} !",
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
