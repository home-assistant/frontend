import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
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
  getSummaryLabel,
  HOME_SUMMARIES,
  HOME_SUMMARIES_FILTERS,
  HOME_SUMMARIES_ICONS,
  type HomeSummary,
} from "./helpers/home-summaries";

export interface HomeAreaViewStrategyConfig {
  type: "home-area";
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

@customElement("home-area-view-strategy")
export class HomeAreaViewStrategy extends ReactiveElement {
  static async generate(
    config: HomeAreaViewStrategyConfig,
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
    });

    const allEntities = Object.keys(hass.states);
    const areaEntities = allEntities.filter(areaFilter);

    const entitiesBySummary = HOME_SUMMARIES.reduce(
      (acc, summary) => {
        const summariesFilters = HOME_SUMMARIES_FILTERS[summary];
        const filterFunctions = summariesFilters.map((filter) =>
          generateEntityFilter(hass, filter)
        );
        acc[summary] = findEntities(areaEntities, filterFunctions);
        return acc;
      },
      {} as Record<HomeSummary, string[]>
    );

    const {
      lights,
      climate,
      security,
      media_players: mediaPlayers,
    } = entitiesBySummary;

    if (lights.length > 0) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard(
            getSummaryLabel(hass.localize, "lights"),
            HOME_SUMMARIES_ICONS.lights,
            "/lights?historyBack=1"
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
            getSummaryLabel(hass.localize, "climate"),
            HOME_SUMMARIES_ICONS.climate,
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
            getSummaryLabel(hass.localize, "security"),
            HOME_SUMMARIES_ICONS.security,
            "security"
          ),
          ...security.map(computeTileCard),
        ],
      });
    }

    if (mediaPlayers.length > 0) {
      sections.push({
        type: "grid",
        cards: [
          computeHeadingCard(
            getSummaryLabel(hass.localize, "media_players"),
            HOME_SUMMARIES_ICONS.media_players,
            "media-players"
          ),
          ...mediaPlayers.map(computeTileCard),
        ],
      });
    }

    const deviceSections: LovelaceSectionRawConfig[] = [];

    const summaryEntities = Object.values(entitiesBySummary).flat();

    // Rest of entities grouped by device
    const otherEntities = areaEntities.filter(
      (entityId) => !summaryEntities.includes(entityId)
    );

    const entitiesByDevice: Record<string, string[]> = {};
    const unassignedEntities: string[] = [];
    for (const entityId of otherEntities) {
      const stateObj = hass.states[entityId];
      if (!stateObj) continue;
      const { device } = getEntityContext(
        stateObj,
        hass.entities,
        hass.devices,
        hass.areas,
        hass.floors
      );
      if (!device) {
        unassignedEntities.push(entityId);
        continue;
      }
      if (!(device.id in entitiesByDevice)) {
        entitiesByDevice[device.id] = [];
      }
      entitiesByDevice[device.id].push(entityId);
    }

    const otherDeviceEntities = Object.entries(entitiesByDevice).map(
      ([deviceId, entities]) => ({
        device_id: deviceId,
        entities: entities,
      })
    );

    if (unassignedEntities.length > 0) {
      otherDeviceEntities.push({
        device_id: "unassigned",
        entities: unassignedEntities,
      });
    }

    const batteryFilter = generateEntityFilter(hass, {
      domain: "sensor",
      device_class: "battery",
    });

    const energyFilter = generateEntityFilter(hass, {
      domain: "sensor",
      device_class: ["energy", "power"],
    });

    const primaryFilter = generateEntityFilter(hass, {
      entity_category: "none",
    });

    for (const deviceEntities of otherDeviceEntities) {
      if (deviceEntities.entities.length === 0) continue;

      const batteryEntities = deviceEntities.entities.filter((e) =>
        batteryFilter(e)
      );
      const entities = deviceEntities.entities.filter(
        (e) => !batteryFilter(e) && !energyFilter(e) && primaryFilter(e)
      );

      if (entities.length === 0) {
        continue;
      }

      const deviceId = deviceEntities.device_id;
      const device = hass.devices[deviceId];
      let heading = "";
      if (device) {
        heading =
          computeDeviceName(device) ||
          hass.localize("ui.panel.lovelace.strategy.home.unamed_device");
      } else {
        heading = hass.localize("ui.panel.lovelace.strategy.home.others");
      }

      deviceSections.push({
        type: "grid",
        cards: [
          {
            type: "heading",
            heading: heading,
            tap_action: device
              ? {
                  action: "navigate",
                  navigation_path: `/config/devices/device/${device.id}`,
                }
              : undefined,
            badges: [
              ...batteryEntities.slice(0, 1).map((e) => ({
                entity: e,
                type: "entity",
                tap_action: {
                  action: "more-info",
                },
              })),
            ],
          } satisfies HeadingCardConfig,
          ...entities.map((e) => {
            const stateObj = hass.states[e];
            return {
              ...computeTileCard(e),
              name:
                hass.formatEntityName(stateObj, "entity") ||
                hass.formatEntityName(stateObj, "device"),
            };
          }),
        ],
      });
    }

    if (deviceSections.length > 0) {
      sections.push({
        type: "grid",
        column_span: 3,
        cards: [
          {
            type: "heading",
            heading_style: "subtitle",
            heading: "",
          } satisfies HeadingCardConfig,
        ],
      } satisfies LovelaceSectionRawConfig);
      sections.push(...deviceSections);
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
    "home-area-view-strategy": HomeAreaViewStrategy;
  }
}
