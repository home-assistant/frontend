import type {
  EntityFilter,
  EntityFilterFunc,
} from "../../../../../common/entity/entity_filter";

export const HOME_SUMMARIES = [
  "lights",
  "climate",
  "security",
  "media_players",
] as const;

export type HomeSummaries = (typeof HOME_SUMMARIES)[number];

export const HOME_SUMMARIES_ICONS: Record<HomeSummaries, string> = {
  lights: "mdi:lamps",
  climate: "mdi:home-thermometer",
  security: "mdi:security",
  media_players: "mdi:multimedia",
};

export const HOME_SUMMARIES_FILTERS: Record<HomeSummaries, EntityFilter[]> = {
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
      domain: "camera",
      entity_category: "none",
    },
    {
      domain: "alarm_control_panel",
      entity_category: "none",
    },
    {
      domain: "lock",
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
): string[] => {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const filter of filters) {
    for (const entity of entities) {
      if (filter(entity) && !seen.has(entity)) {
        seen.add(entity);
        results.push(entity);
      }
    }
  }

  return results;
};
