import type {
  EntityFilter,
  EntityFilterFunc,
} from "../../../../../common/entity/entity_filter";

export const OVERVIEW_CATEGORIES = ["lights", "climate", "security"] as const;

export type OverviewCategory = (typeof OVERVIEW_CATEGORIES)[number];

export const OVERVIEW_CATEGORIES_ICONS: Record<OverviewCategory, string> = {
  lights: "mdi:lamps",
  climate: "mdi:home-thermometer",
  security: "mdi:security",
};

export const OVERVIEW_CATEGORIES_FILTERS: Record<
  OverviewCategory,
  EntityFilter[]
> = {
  lights: [{ domain: "light", entity_category: "none" }],
  climate: [
    { domain: "climate", entity_category: "none" },
    { domain: "humidifier", entity_category: "none" },
    { domain: "fan", entity_category: "none" },
    { domain: "water_heater", entity_category: "none" },
    {
      domain: "cover",
      device_class: [
        "awning",
        "blind",
        "curtain",
        "shade",
        "shutter",
        "window",
        "none",
      ],
      entity_category: "none",
    },
    {
      domain: "binary_sensor",
      device_class: ["window"],
      entity_category: "none",
    },
  ],
  security: [
    {
      domain: "alarm_control_panel",
      entity_category: "none",
    },
    {
      domain: "lock",
      entity_category: "none",
    },
    {
      domain: "camera",
      entity_category: "none",
    },
    {
      domain: "cover",
      device_class: ["door", "garage", "gate"],
    },
    {
      domain: "binary_sensor",
      device_class: ["door", "garage_door"],
      entity_category: "none",
    },
  ],
};

export const findEntities = (
  entities: string[],
  filters: EntityFilterFunc[]
): string[] =>
  filters.reduce<string[]>(
    (acc, filter) => [...acc, ...entities.filter((entity) => filter(entity))],
    []
  );
