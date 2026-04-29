import type { EntityFilter } from "../../../../../common/entity/entity_filter";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import { maintenanceEntityFilters } from "../../../../maintenance/strategies/maintenance-view-strategy";
import { climateEntityFilters } from "../../../../climate/strategies/climate-view-strategy";
import { lightEntityFilters } from "../../../../light/strategies/light-view-strategy";
import { securityEntityFilters } from "../../../../security/strategies/security-view-strategy";

export const HOME_SUMMARIES = [
  "light",
  "climate",
  "security",
  "media_players",
  "maintenance",
  "energy",
  "persons",
] as const;

export type HomeSummary = (typeof HOME_SUMMARIES)[number];

export const HOME_SUMMARIES_ICONS: Record<HomeSummary, string> = {
  light: "mdi:lamps",
  climate: "mdi:home-thermometer",
  security: "mdi:security",
  media_players: "mdi:multimedia",
  maintenance: "mdi:wrench",
  energy: "mdi:lightning-bolt",
  persons: "mdi:account-multiple",
};

export const HOME_SUMMARIES_COLORS: Record<HomeSummary, string> = {
  light: "amber",
  climate: "deep-orange",
  security: "blue-grey",
  media_players: "blue",
  maintenance: "grey",
  energy: "amber",
  persons: "green",
};

export const HOME_SUMMARIES_FILTERS: Record<HomeSummary, EntityFilter[]> = {
  light: lightEntityFilters,
  climate: climateEntityFilters,
  security: securityEntityFilters,
  media_players: [{ domain: "media_player", entity_category: "none" }],
  maintenance: maintenanceEntityFilters,
  energy: [], // Uses energy collection data
  persons: [{ domain: "person" }],
};

export const getSummaryLabel = (
  localize: LocalizeFunc,
  summary: HomeSummary
) => {
  if (
    summary === "light" ||
    summary === "climate" ||
    summary === "security" ||
    summary === "maintenance"
  ) {
    return localize(`panel.${summary}`);
  }
  return localize(`ui.panel.lovelace.strategy.home.summary_list.${summary}`);
};
