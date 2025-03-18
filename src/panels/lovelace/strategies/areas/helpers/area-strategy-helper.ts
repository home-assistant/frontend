import {
  mdiHomeThermometer,
  mdiLightbulb,
  mdiMultimedia,
  mdiSecurity,
} from "@mdi/js";
import type { EntityFilterFunc } from "../../../../../common/entity/entity_filter";
import { generateEntityFilter } from "../../../../../common/entity/entity_filter";
import type { HomeAssistant } from "../../../../../types";
import { orderCompare } from "../../../../../common/string/compare";

export const AREA_STRATEGY_GROUPS = [
  "lights",
  "climate",
  "media_players",
  "security",
] as const;

export const AREA_STRATEGY_GROUP_ICONS = {
  lights: mdiLightbulb,
  climate: mdiHomeThermometer,
  media_players: mdiMultimedia,
  security: mdiSecurity,
};

// Todo be replace by translation when validated
export const AREA_STRATEGY_GROUP_LABELS = {
  lights: "Lights",
  climate: "Climate",
  media_players: "Entertainment",
  security: "Security",
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
