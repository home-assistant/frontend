import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { EntityFilterFunc } from "../../../../common/entity/entity_filter";
import { generateEntityFilter } from "../../../../common/entity/entity_filter";
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

type Group = "lights" | "climate" | "media_players" | "security";

type AreaEntitiesByGroup = Record<Group, string[]>;

type AreaFilteredByGroup = Record<Group, EntityFilterFunc[]>;

export const getAreaGroupedEntities = (
  area: string,
  hass: HomeAssistant,
  controlOnly = false
): AreaEntitiesByGroup => {
  const allEntities = Object.keys(hass.states);

  const groupedFilters: AreaFilteredByGroup = {
    lights: [
      generateEntityFilter(hass, {
        domain: "light",
        area: area,
        entity_category: "none",
      }),
    ],
    climate: [
      generateEntityFilter(hass, {
        domain: "climate",
        area: area,
        entity_category: "none",
      }),
      generateEntityFilter(hass, {
        domain: "humidifier",
        area: area,
        entity_category: "none",
      }),
      generateEntityFilter(hass, {
        domain: "cover",
        area: area,
        device_class: [
          "shutter",
          "awning",
          "blind",
          "curtain",
          "shade",
          "shutter",
          "window",
        ],
        entity_category: "none",
      }),
      ...(controlOnly
        ? []
        : [
            generateEntityFilter(hass, {
              domain: "binary_sensor",
              area: area,
              device_class: "window",
              entity_category: "none",
            }),
          ]),
    ],
    media_players: [
      generateEntityFilter(hass, {
        domain: "media_player",
        area: area,
        entity_category: "none",
      }),
    ],
    security: [
      generateEntityFilter(hass, {
        domain: "alarm_control_panel",
        area: area,
        entity_category: "none",
      }),
      generateEntityFilter(hass, {
        domain: "lock",
        area: area,
        entity_category: "none",
      }),
      generateEntityFilter(hass, {
        domain: "cover",
        device_class: ["door", "garage", "gate"],
        area: area,
        entity_category: "none",
      }),
      ...(controlOnly
        ? []
        : [
            generateEntityFilter(hass, {
              domain: "binary_sensor",
              device_class: ["door", "garage_door"],
              area: area,
              entity_category: "none",
            }),
          ]),
    ],
  };

  return Object.fromEntries(
    Object.entries(groupedFilters).map(([group, filters]) => [
      group,
      filters.reduce<string[]>(
        (acc, filter) => [
          ...acc,
          ...allEntities.filter((entity) => filter(entity)),
        ],
        []
      ),
    ])
  ) as AreaEntitiesByGroup;
};

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
          computeHeadingCard("Lights", "mdi:lightbulb"),
          ...lights.map(computeTileCard),
        ],
      });
    }

    if (climate.length > 0) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard("Climate", "mdi:home-thermometer"),
          ...climate.map(computeTileCard),
        ],
      });
    }

    if (mediaPlayers.length > 0) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard("Entertainment", "mdi:multimedia"),
          ...mediaPlayers.map(computeTileCard),
        ],
      });
    }

    if (security.length > 0) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard("Security", "mdi:security"),
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
