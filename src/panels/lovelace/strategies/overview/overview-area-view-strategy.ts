import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { computeEntityName } from "../../../../common/entity/compute_entity_name";
import { getEntityContext } from "../../../../common/entity/context/get_entity_context";
import { generateEntityFilter } from "../../../../common/entity/entity_filter";
import { clamp } from "../../../../common/number/clamp";
import type { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import type { HeadingCardConfig } from "../../cards/types";
import { computeAreaTileCardConfig } from "../areas/helpers/areas-strategy-helper";
import {
  findEntities,
  OVERVIEW_CATEGORIES,
  OVERVIEW_CATEGORIES_FILTERS,
  OVERVIEW_CATEGORIES_ICONS,
  type OverviewCategory,
} from "./helpers/overview-categories";

export interface OverviewAreaViewStrategyConfig {
  type: "overview-area";
  area?: string;
}

const computeHeadingCard = (
  heading: string,
  icon: string,
  navigation_path?: string
): LovelaceCardConfig =>
  ({
    type: "heading",
    heading: heading,
    icon: icon,
    tap_action: navigation_path
      ? {
          action: "navigate",
          navigation_path,
        }
      : undefined,
  }) satisfies HeadingCardConfig;

@customElement("overview-area-view-strategy")
export class OverviewAreaViewStrategy extends ReactiveElement {
  static async generate(
    config: OverviewAreaViewStrategyConfig,
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

    const computeTileCard = computeAreaTileCardConfig(hass, area.name, true);

    const areaFilter = generateEntityFilter(hass, {
      area: config.area,
      entity_category: "none",
    });

    const allEntities = Object.keys(hass.states);
    const areaEntities = allEntities.filter(areaFilter);

    const entitiesByCategory = OVERVIEW_CATEGORIES.reduce(
      (acc, category) => {
        const categoryFilters = OVERVIEW_CATEGORIES_FILTERS[category];
        const filterFunctions = categoryFilters.map((filter) =>
          generateEntityFilter(hass, filter)
        );
        acc[category] = findEntities(areaEntities, filterFunctions);
        return acc;
      },
      {} as Record<OverviewCategory, string[]>
    );

    const { lights, climate, security } = entitiesByCategory;

    if (lights.length > 0) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard(
            hass.localize("ui.panel.lovelace.strategy.areas.groups.lights"),
            OVERVIEW_CATEGORIES_ICONS.lights,
            "lights"
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
            hass.localize("ui.panel.lovelace.strategy.areas.groups.climate"),
            OVERVIEW_CATEGORIES_ICONS.climate,
            "climate"
          ),
          ...climate.map(computeTileCard),
        ],
      });
    }

    if (security.length > 0) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard(
            hass.localize("ui.panel.lovelace.strategy.areas.groups.security"),
            OVERVIEW_CATEGORIES_ICONS.security,
            "security"
          ),
          ...security.map(computeTileCard),
        ],
      });
    }

    // Rest of entities grouped by device
    const otherEntities = areaEntities.filter(
      (entityId) => ![...lights, ...climate, ...security].includes(entityId)
    );

    const entitiesByDevice: Record<string, string[]> = {};
    for (const entityId of otherEntities) {
      const stateObj = hass.states[entityId];
      if (!stateObj) continue;
      const { device } = getEntityContext(stateObj, hass);
      if (!device) continue;
      if (!(device.id in entitiesByDevice)) {
        entitiesByDevice[device.id] = [];
      }
      entitiesByDevice[device.id].push(entityId);
    }

    const otherDeviceEntities = Object.entries(entitiesByDevice).map(
      ([deviceId, entities]) => ({
        device_id: deviceId,
        entities: entities.map((entityId) => hass.states[entityId]),
      })
    );

    if (otherDeviceEntities.length > 0) {
      sections.push({
        type: "grid",
        column_span: 3,
        cards: [
          {
            type: "heading",
            icon: "mdi:devices",
            heading: "Devices",
          } satisfies HeadingCardConfig,
        ],
      });
    }

    const batteryFilter = generateEntityFilter(hass, {
      domain: "sensor",
      device_class: "battery",
    });

    for (const deviceEntities of otherDeviceEntities) {
      if (deviceEntities.entities.length === 0) continue;
      const device = hass.devices[deviceEntities.device_id];

      const batteryEntities = deviceEntities.entities.filter((e) =>
        batteryFilter(e.entity_id)
      );
      const entities = deviceEntities.entities.filter(
        (entity) => !batteryFilter(entity.entity_id)
      );

      sections.push({
        type: "grid",
        cards: [
          {
            type: "heading",
            heading: computeDeviceName(device),
            heading_style: "subtitle",
            tap_action: {
              action: "navigate",
              navigation_path: `/config/devices/device/${deviceEntities.device_id}`,
            },
            badges: [
              ...batteryEntities.slice(0, 1).map((entity) => ({
                entity: entity.entity_id,
                type: "entity",
              })),
            ],
          } satisfies HeadingCardConfig,
          ...entities.map((entity) => ({
            ...computeTileCard(entity.entity_id),
            name: computeEntityName(entity, hass) || computeDeviceName(device),
          })),
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
      },
      max_columns: maxColumns,
      sections: sections,
      badges: badges,
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "overview-area-view-strategy": OverviewAreaViewStrategy;
  }
}
