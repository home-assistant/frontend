import type {
  EntityFilter,
  EntityFilterFunc,
} from "../../../../../common/entity/entity_filter";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import { lightFilters } from "../../../../lights/strategies/lights-view-strategy";

export const HOME_SUMMARIES = [
  "lights",
  "climate",
  "security",
  "media_players",
] as const;

export type HomeSummary = (typeof HOME_SUMMARIES)[number];

export const HOME_SUMMARIES_ICONS: Record<HomeSummary, string> = {
  lights: "mdi:lamps",
  climate: "mdi:home-thermometer",
  security: "mdi:security",
  media_players: "mdi:multimedia",
};

export const HOME_SUMMARIES_FILTERS: Record<HomeSummary, EntityFilter[]> = {
  lights: lightFilters,
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
      device_class: [
        // Locks
        "lock",
        // Openings
        "door",
        "window",
        "garage_door",
        "opening",
        // Safety
        "carbon_monoxide",
        "gas",
        "moisture",
        "safety",
        "smoke",
        "tamper",
      ],
      entity_category: "none",
    },
    // We also want the tamper sensors when they are diagnostic
    {
      domain: "binary_sensor",
      device_class: ["tamper"],
      entity_category: "diagnostic",
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

export const getSummaryLabel = (localize: LocalizeFunc, summary: HomeSummary) =>
  localize(`ui.panel.lovelace.strategy.home.summary_list.${summary}`);
