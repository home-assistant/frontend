import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";
import type { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import type { EntitiesFilterSectionStrategyConfig } from "../entities-filter/entities-filter-section-strategy";

export interface AreaViewStrategyConfig {
  type: "area";
  area?: string;
}

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

    // Lights
    sections.push({
      strategy: {
        type: "entities-filter",
        title: "Lights",
        icon: "mdi:lamps",
        filter: {
          domain: "light",
          area: config.area,
          entity_category: "none",
        },
      } satisfies EntitiesFilterSectionStrategyConfig,
    });

    // Climate
    sections.push({
      strategy: {
        type: "entities-filter",
        title: "Climate",
        icon: "mdi:home-thermometer",
        groups: [
          {
            title: "Thermostat and humidifier",
            icon: "mdi:thermostat",
            filter: {
              domain: ["climate", "humidifier"],
              area: config.area,
              entity_category: "none",
            },
          },
          {
            title: "Shutters",
            icon: "mdi:window-shutter",
            filter: {
              domain: "cover",
              device_class: [
                "shutter",
                "awning",
                "blind",
                "curtain",
                "shade",
                "shutter",
                "window",
              ],
              area: config.area,
              entity_category: "none",
            },
          },
          {
            title: "Sensors",
            icon: "mdi:wifi",
            filter: {
              domain: "binary_sensor",
              device_class: "window",
              area: config.area,
              entity_category: "none",
            },
          },
        ],
      } satisfies EntitiesFilterSectionStrategyConfig,
    });

    // Entertainment
    sections.push({
      strategy: {
        type: "entities-filter",
        title: "Entertainment",
        icon: "mdi:multimedia",
        filter: {
          domain: "media_player",
          area: config.area,
          entity_category: "none",
        },
      } satisfies EntitiesFilterSectionStrategyConfig,
    });

    // Security
    sections.push({
      strategy: {
        type: "entities-filter",
        title: "Security",
        icon: "mdi:shield",
        groups: [
          {
            title: "Alarm and locks",
            icon: "mdi:alarm-light",
            filter: {
              domain: ["lock", "alarm_control_panel"],
              area: config.area,
              entity_category: "none",
            },
          },
          {
            title: "Doors",
            icon: "mdi:door",
            filter: {
              domain: "cover",
              device_class: ["door", "garage", "gate"],
              area: config.area,
              entity_category: "none",
            },
          },
          {
            title: "Sensors",
            icon: "mdi:wifi",
            filter: {
              domain: "binary_sensor",
              device_class: ["door", "garage_door"],
              area: config.area,
              entity_category: "none",
            },
          },
        ],
      } satisfies EntitiesFilterSectionStrategyConfig,
    });

    // Switches
    sections.push({
      strategy: {
        type: "entities-filter",
        title: "Switches",
        icon: "mdi:shield",
        filter: {
          domain: "switch",
          area: config.area,
          entity_category: "none",
        },
      } satisfies EntitiesFilterSectionStrategyConfig,
    });

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
