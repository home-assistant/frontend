import { computeDomain } from "../../../../../common/entity/compute_domain";
import { computeStateName } from "../../../../../common/entity/compute_state_name";
import type { EntityFilterFunc } from "../../../../../common/entity/entity_filter";
import { generateEntityFilter } from "../../../../../common/entity/entity_filter";
import { stripPrefixFromEntityName } from "../../../../../common/entity/strip_prefix_from_entity_name";
import {
  orderCompare,
  stringCompare,
} from "../../../../../common/string/compare";
import type { AreaRegistryEntry } from "../../../../../data/area_registry";
import { areaCompare } from "../../../../../data/area_registry";
import type { FloorRegistryEntry } from "../../../../../data/floor_registry";
import type { LovelaceCardConfig } from "../../../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../../../types";
import { supportsAlarmModesCardFeature } from "../../../card-features/hui-alarm-modes-card-feature";
import { supportsCoverOpenCloseCardFeature } from "../../../card-features/hui-cover-open-close-card-feature";
import { supportsLightBrightnessCardFeature } from "../../../card-features/hui-light-brightness-card-feature";
import { supportsLockCommandsCardFeature } from "../../../card-features/hui-lock-commands-card-feature";
import { supportsTargetTemperatureCardFeature } from "../../../card-features/hui-target-temperature-card-feature";
import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../../card-features/types";
import type { TileCardConfig } from "../../../cards/types";

export const AREA_STRATEGY_GROUPS = [
  "lights",
  "climate",
  "covers",
  "media_players",
  "security",
  "actions",
  "others",
] as const;

export const AREA_STRATEGY_GROUP_ICONS = {
  lights: "mdi:lamps",
  climate: "mdi:home-thermometer",
  covers: "mdi:blinds-horizontal",
  media_players: "mdi:multimedia",
  security: "mdi:security",
  actions: "mdi:robot",
  others: "mdi:shape",
};

export type AreaStrategyGroup = (typeof AREA_STRATEGY_GROUPS)[number];

type AreaEntitiesByGroup = Record<AreaStrategyGroup, string[]>;

type AreaFilteredByGroup = Record<AreaStrategyGroup, EntityFilterFunc[]>;

interface DisplayOptions {
  hidden?: string[];
  order?: string[];
}

type AreaGroupsDisplayOptions = Record<string, DisplayOptions>;

export const getAreaGroupedEntities = (
  area: string,
  hass: HomeAssistant,
  displayOptions?: AreaGroupsDisplayOptions
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
    covers: [
      generateEntityFilter(hass, {
        domain: "cover",
        area: area,
        entity_category: "none",
      }),
      generateEntityFilter(hass, {
        domain: "binary_sensor",
        area: area,
        device_class: ["door", "garage_door", "window"],
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
        domain: "water_heater",
        area: area,
        entity_category: "none",
      }),
      generateEntityFilter(hass, {
        domain: "fan",
        area: area,
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
        domain: "camera",
        area: area,
        entity_category: "none",
      }),
    ],
    actions: [
      generateEntityFilter(hass, {
        domain: ["script", "scene"],
        area: area,
        entity_category: "none",
      }),
      generateEntityFilter(hass, {
        domain: ["automation"],
        area: area,
        entity_category: "none",
      }),
    ],
    others: [
      generateEntityFilter(hass, {
        domain: "vacuum",
        area: area,
        entity_category: "none",
      }),
      generateEntityFilter(hass, {
        domain: "lawn_mower",
        area: area,
        entity_category: "none",
      }),
      generateEntityFilter(hass, {
        domain: "valve",
        area: area,
        entity_category: "none",
      }),
      generateEntityFilter(hass, {
        domain: ["switch", "button", "input_boolean", "input_button"],
        area: area,
        entity_category: "none",
      }),
      generateEntityFilter(hass, {
        domain: [
          "select",
          "number",
          "input_select",
          "input_number",
          "counter",
          "timer",
        ],
        area: area,
        entity_category: "none",
      }),
    ],
  };

  return Object.fromEntries(
    Object.entries(groupedFilters).map(([group, filters]) => {
      const entities = filters.reduce<string[]>(
        (acc, filter) => [
          ...acc,
          ...allEntities.filter((entity) => filter(entity)),
        ],
        []
      );

      const hidden = displayOptions?.[group]?.hidden
        ? new Set(displayOptions[group].hidden)
        : undefined;

      const order = displayOptions?.[group]?.order;

      let filteredEntities = entities;
      if (hidden) {
        filteredEntities = entities.filter(
          (entity: string) => !hidden.has(entity)
        );
      }
      if (order) {
        filteredEntities = filteredEntities.concat().sort(orderCompare(order));
      }
      return [group, filteredEntities];
    })
  ) as AreaEntitiesByGroup;
};

export const computeAreaTileCardConfig =
  (hass: HomeAssistant, prefix: string, includeFeature?: boolean) =>
  (entity: string): LovelaceCardConfig => {
    const stateObj = hass.states[entity];

    const context: LovelaceCardFeatureContext = {
      entity_id: entity,
    };

    const additionalCardConfig: Partial<TileCardConfig> = {};

    const domain = computeDomain(entity);

    if (domain === "camera") {
      return {
        type: "picture-entity",
        entity: entity,
        show_state: false,
        show_name: false,
        grid_options: {
          columns: 6,
          rows: 2,
        },
      };
    }

    let feature: LovelaceCardFeatureConfig | undefined;
    if (includeFeature) {
      if (supportsLightBrightnessCardFeature(hass, context)) {
        feature = {
          type: "light-brightness",
        };
      } else if (supportsCoverOpenCloseCardFeature(hass, context)) {
        feature = {
          type: "cover-open-close",
        };
      } else if (supportsTargetTemperatureCardFeature(hass, context)) {
        feature = {
          type: "target-temperature",
        };
      } else if (supportsAlarmModesCardFeature(hass, context)) {
        feature = {
          type: "alarm-modes",
        };
      } else if (supportsLockCommandsCardFeature(hass, context)) {
        feature = {
          type: "lock-commands",
        };
      }
    }

    if (feature) {
      additionalCardConfig.features = [feature];
    }

    const name = computeStateName(stateObj);
    const stripedName = stripPrefixFromEntityName(name, prefix.toLowerCase());

    return {
      type: "tile",
      entity: entity,
      name: stripedName,
      ...additionalCardConfig,
    };
  };

export const getAreas = (
  entries: HomeAssistant["areas"],
  hiddenAreas?: string[],
  areasOrder?: string[]
): AreaRegistryEntry[] => {
  const areas = Object.values(entries);

  const filteredAreas = hiddenAreas
    ? areas.filter((area) => !hiddenAreas!.includes(area.area_id))
    : areas.concat();

  const compare = areaCompare(entries, areasOrder);

  const sortedAreas = filteredAreas.sort((areaA, areaB) =>
    compare(areaA.area_id, areaB.area_id)
  );

  return sortedAreas;
};

export const getFloors = (
  entries: HomeAssistant["floors"],
  floorsOrder?: string[]
): FloorRegistryEntry[] => {
  const floors = Object.values(entries);
  const compare = orderCompare(floorsOrder || []);

  return floors.sort((floorA, floorB) => {
    const order = compare(floorA.floor_id, floorB.floor_id);
    if (order !== 0) {
      return order;
    }
    if (floorA.level !== floorB.level) {
      return (floorA.level ?? 0) - (floorB.level ?? 0);
    }
    return stringCompare(floorA.name, floorB.name);
  });
};

export const computeAreaPath = (areaId: string): string => `areas-${areaId}`;
