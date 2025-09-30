import type { EntityFilter } from "../../../../../common/entity/entity_filter";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import { climateEntityFilters } from "../../../../climate/strategies/climate-view-strategy";
import { lightEntityFilters } from "../../../../lights/strategies/lights-view-strategy";
import { securityEntityFilters } from "../../../../security/strategies/security-view-strategy";

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
  lights: lightEntityFilters,
  climate: climateEntityFilters,
  security: securityEntityFilters,
  media_players: [{ domain: "media_player", entity_category: "none" }],
};

export const getSummaryLabel = (
  localize: LocalizeFunc,
  summary: HomeSummary
) => {
  if (summary === "lights" || summary === "climate" || summary === "security") {
    return localize(`panel.${summary}`);
  }
  return localize(`ui.panel.lovelace.strategy.home.summary_list.${summary}`);
};
