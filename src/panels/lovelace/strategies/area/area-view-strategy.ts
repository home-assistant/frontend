import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { generateEntityFilter } from "../../../../common/entity/entity_filter";
import type { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";

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

    const allEntities = Object.keys(hass.states);

    // Lights
    const lights = allEntities.filter(
      generateEntityFilter(hass, {
        domain: "light",
        area: config.area,
        entity_category: "none",
      })
    );

    if (lights.length) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard("Lights", "mdi:lightbulb"),
          ...lights.map(computeTileCard),
        ],
      });
    }

    // Climate
    const thermostats = allEntities.filter(
      generateEntityFilter(hass, {
        domain: "climate",
        area: config.area,
        entity_category: "none",
      })
    );

    const humidifiers = allEntities.filter(
      generateEntityFilter(hass, {
        domain: "humidifier",
        area: config.area,
        entity_category: "none",
      })
    );

    const shutters = allEntities.filter(
      generateEntityFilter(hass, {
        domain: "cover",
        area: config.area,
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
      })
    );

    const climateSensor = allEntities.filter(
      generateEntityFilter(hass, {
        domain: "binary_sensor",
        area: config.area,
        device_class: "window",
        entity_category: "none",
      })
    );

    if (
      thermostats.length ||
      humidifiers.length ||
      shutters.length ||
      climateSensor.length
    ) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard("Climate", "mdi:home-thermometer"),
          ...thermostats.map(computeTileCard),
          ...humidifiers.map(computeTileCard),
          ...shutters.map(computeTileCard),
          ...climateSensor.map(computeTileCard),
        ],
      });
    }

    // Media players
    const mediaPlayers = allEntities.filter(
      generateEntityFilter(hass, {
        domain: "media_player",
        area: config.area,
        entity_category: "none",
      })
    );

    if (mediaPlayers.length > 0) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard("Entertainment", "mdi:multimedia"),
          ...mediaPlayers.map(computeTileCard),
        ],
      });
    }

    // Security
    const alarms = allEntities.filter(
      generateEntityFilter(hass, {
        domain: "alarm_control_panel",
        area: config.area,
        entity_category: "none",
      })
    );
    const locks = allEntities.filter(
      generateEntityFilter(hass, {
        domain: "lock",
        area: config.area,
        entity_category: "none",
      })
    );
    const doors = allEntities.filter(
      generateEntityFilter(hass, {
        domain: "cover",
        device_class: ["door", "garage", "gate"],
        area: config.area,
        entity_category: "none",
      })
    );
    const securitySensors = allEntities.filter(
      generateEntityFilter(hass, {
        domain: "binary_sensor",
        device_class: ["door", "garage_door"],
        area: config.area,
        entity_category: "none",
      })
    );

    if (
      alarms.length > 0 ||
      locks.length > 0 ||
      doors.length > 0 ||
      securitySensors.length > 0
    ) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard("Security", "mdi:security"),
          ...alarms.map(computeTileCard),
          ...locks.map(computeTileCard),
          ...doors.map(computeTileCard),
          ...securitySensors.map(computeTileCard),
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
