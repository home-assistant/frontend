import type {
  EntityFilter,
  EntityFilterFunc,
} from "../../../../../common/entity/entity_filter";

export const OVERVIEW_SUMMARIES = [
  "lights",
  "climate",
  "security",
  "media_players",
] as const;

export type OverviewSummaries = (typeof OVERVIEW_SUMMARIES)[number];

export const OVERVIEW_SUMMARIES_ICONS: Record<OverviewSummaries, string> = {
  lights: "mdi:lamps",
  climate: "mdi:home-thermometer",
  security: "mdi:security",
  media_players: "mdi:multimedia",
};

export const OVERVIEW_SUMMARIES_FILTERS: Record<
  OverviewSummaries,
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
      entity_category: "none",
    },
    {
      domain: "binary_sensor",
      device_class: ["door", "garage_door"],
      entity_category: "none",
    },
  ],
  media_players: [{ domain: "media_player", entity_category: "none" }],
};

export const findEntities = (
  entities: string[],
  filters: EntityFilterFunc[]
): string[] =>
  filters.reduce<string[]>(
    (acc, filter) => [...acc, ...entities.filter((entity) => filter(entity))],
    []
  );
