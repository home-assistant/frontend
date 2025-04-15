import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { clamp } from "../../../../common/number/clamp";
import type { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import {
  AREA_STRATEGY_GROUP_ICONS,
  computeAreaTileCardConfig,
  getAreaGroupedEntities,
} from "./helpers/areas-strategy-helper";

export interface EntitiesDisplay {
  hidden?: string[];
  order?: string[];
}

export interface AreaViewStrategyConfig {
  type: "area";
  area?: string;
  groups_options?: Record<string, EntitiesDisplay>;
}

const computeHeadingCard = (
  heading: string,
  icon: string
): LovelaceCardConfig => ({
  type: "heading",
  heading: heading,
  icon: icon,
});

@customElement("area-view-strategy")
export class AreaViewStrategy extends ReactiveElement {
  static async generate(
    config: AreaViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    if (!config.area) {
      throw new Error("Area not provided");
    }

    const area = hass.areas[config.area];

    if (!area) {
      throw new Error("Unknown area");
    }

    const sections: LovelaceSectionRawConfig[] = [];

    const badges: LovelaceBadgeConfig[] = [];

    if (area.temperature_entity_id) {
      badges.push({
        entity: area.temperature_entity_id,
        type: "entity",
        color: "red",
      });
    }

    if (area.humidity_entity_id) {
      badges.push({
        entity: area.humidity_entity_id,
        type: "entity",
        color: "indigo",
      });
    }

    const groupedEntities = getAreaGroupedEntities(
      config.area,
      hass,
      config.groups_options
    );

    const computeTileCard = computeAreaTileCardConfig(hass, area.name, true);

    const { lights, climate, covers, media_players, security, others } =
      groupedEntities;

    if (lights.length > 0) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard(
            hass.localize("ui.panel.lovelace.strategy.areas.groups.lights"),
            AREA_STRATEGY_GROUP_ICONS.lights
          ),
          ...lights.map(computeTileCard),
        ],
      });
    }

    if (covers.length > 0) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard(
            hass.localize("ui.panel.lovelace.strategy.areas.groups.covers"),
            AREA_STRATEGY_GROUP_ICONS.covers
          ),
          ...covers.map(computeTileCard),
        ],
      });
    }

    if (climate.length > 0) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard(
            hass.localize("ui.panel.lovelace.strategy.areas.groups.climate"),
            AREA_STRATEGY_GROUP_ICONS.climate
          ),
          ...climate.map(computeTileCard),
        ],
      });
    }

    if (media_players.length > 0) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard(
            hass.localize(
              "ui.panel.lovelace.strategy.areas.groups.media_players"
            ),
            AREA_STRATEGY_GROUP_ICONS.media_players
          ),
          ...media_players.map(computeTileCard),
        ],
      });
    }

    if (security.length > 0) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard(
            hass.localize("ui.panel.lovelace.strategy.areas.groups.security"),
            AREA_STRATEGY_GROUP_ICONS.security
          ),
          ...security.map(computeTileCard),
        ],
      });
    }

    if (others.length > 0) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard(
            hass.localize("ui.panel.lovelace.strategy.areas.groups.others"),
            AREA_STRATEGY_GROUP_ICONS.others
          ),
          ...others.map(computeTileCard),
        ],
      });
    }

    // Allow between 2 and 3 columns (the max should be set to define the width of the header)
    const maxColumns = clamp(sections.length, 2, 3);

    // Take the full width if there is only one section to avoid narrow header on desktop
    if (sections.length === 1) {
      sections[0].column_span = 2;
    }

    return {
      type: "sections",
      header: {
        badges_position: "bottom",
        layout: "responsive",
        card: {
          type: "markdown",
          text_only: true,
          content: `## ${area.name}`,
        },
      },
      max_columns: maxColumns,
      sections: sections,
      badges: badges,
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "area-view-strategy": AreaViewStrategy;
  }
}
