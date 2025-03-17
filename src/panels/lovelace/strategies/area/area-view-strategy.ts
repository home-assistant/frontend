import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { EntityFilterFunc } from "../../../../common/entity/entity_filter";
import { generateEntityFilter } from "../../../../common/entity/entity_filter";
import type { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";

type Group = "lights" | "climate" | "media_players" | "security";

type AreaEntitiesByGroup = Record<Group, string[]>;

type AreaFilteredByGroup = Record<Group, EntityFilterFunc[]>;

export const getAreaGroupedEntities = (
  area: string,
  hass: HomeAssistant
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
      generateEntityFilter(hass, {
        domain: "binary_sensor",
        area: area,
        device_class: "window",
        entity_category: "none",
      }),
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
      generateEntityFilter(hass, {
        domain: "binary_sensor",
        device_class: ["door", "garage_door"],
        area: area,
        entity_category: "none",
      }),
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

const computeTileCard = (entity: string): LovelaceCardConfig => ({
  type: "tile",
  entity: entity,
});

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
