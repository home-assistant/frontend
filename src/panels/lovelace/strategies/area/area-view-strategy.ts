import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import { supportsAlarmModesCardFeature } from "../../card-features/hui-alarm-modes-card-feature";
import { supportsCoverOpenCloseCardFeature } from "../../card-features/hui-cover-open-close-card-feature";
import { supportsLightBrightnessCardFeature } from "../../card-features/hui-light-brightness-card-feature";
import { supportsLockCommandsCardFeature } from "../../card-features/hui-lock-commands-card-feature";
import { supportsTargetTemperatureCardFeature } from "../../card-features/hui-target-temperature-card-feature";
import type { LovelaceCardFeatureConfig } from "../../card-features/types";
import {
  AREA_STRATEGY_GROUP_ICONS,
  AREA_STRATEGY_GROUP_LABELS,
  getAreaGroupedEntities,
} from "./helpers/area-strategy-helper";

export interface AreaViewStrategyConfig {
  type: "area";
  area?: string;
}

const computeTileCardConfig =
  (hass: HomeAssistant) =>
  (entity: string): LovelaceCardConfig => {
    const stateObj = hass.states[entity];

    let feature: LovelaceCardFeatureConfig | undefined;
    if (supportsLightBrightnessCardFeature(stateObj)) {
      feature = {
        type: "light-brightness",
      };
    } else if (supportsCoverOpenCloseCardFeature(stateObj)) {
      feature = {
        type: "cover-open-close",
      };
    } else if (supportsTargetTemperatureCardFeature(stateObj)) {
      feature = {
        type: "target-temperature",
      };
    } else if (supportsAlarmModesCardFeature(stateObj)) {
      feature = {
        type: "alarm-modes",
      };
    } else if (supportsLockCommandsCardFeature(stateObj)) {
      feature = {
        type: "lock-commands",
      };
    }

    return {
      type: "tile",
      entity: entity,
      features: feature ? [feature] : undefined,
    };
  };

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

    const groupedEntities = getAreaGroupedEntities(config.area, hass);

    const computeTileCard = computeTileCardConfig(hass);

    const {
      lights,
      climate,
      media_players: mediaPlayers,
      security,
    } = groupedEntities;
    if (lights.length > 0) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard(
            AREA_STRATEGY_GROUP_LABELS.lights,
            AREA_STRATEGY_GROUP_ICONS.lights
          ),
          ...lights.map(computeTileCard),
        ],
      });
    }

    if (climate.length > 0) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard(
            AREA_STRATEGY_GROUP_LABELS.climate,
            AREA_STRATEGY_GROUP_ICONS.climate
          ),
          ...climate.map(computeTileCard),
        ],
      });
    }

    if (mediaPlayers.length > 0) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard(
            AREA_STRATEGY_GROUP_LABELS.media_players,
            AREA_STRATEGY_GROUP_ICONS.media_players
          ),
          ...mediaPlayers.map(computeTileCard),
        ],
      });
    }

    if (security.length > 0) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard(
            AREA_STRATEGY_GROUP_LABELS.security,
            AREA_STRATEGY_GROUP_ICONS.security
          ),
          ...security.map(computeTileCard),
        ],
      });
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
      max_columns: 2,
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
