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
} from "../../cards/types";
import { getAreas } from "../areas/helpers/areas-strategy-helper";
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

@customElement("overview-home-view-strategy")
export class OverviewHomeViewStrategy extends ReactiveElement {
  static async generate(
    config: OverviewHomeViewStrategyConfig,
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
          headiing: "",
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
          icon: OVERVIEW_SUMMARIES_ICONS.lights,
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
          icon: OVERVIEW_SUMMARIES_ICONS.climate,
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
          icon: OVERVIEW_SUMMARIES_ICONS.security,
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
          icon: OVERVIEW_SUMMARIES_ICONS.media_players,
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
        {
          type: "button",
          icon: "mdi:lightning-bolt",
          name: "Energy",
          icon_height: "30px",
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
      areasSection,
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
