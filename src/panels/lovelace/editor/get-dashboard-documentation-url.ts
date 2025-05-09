import {
  getCustomBadgeEntry,
  getCustomCardEntry,
  isCustomType,
  stripCustomPrefix,
} from "../../../data/lovelace_custom_cards";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";

const NON_STANDARD_URLS = {
  "energy-date-selection": "energy/#energy-date-picker",
  "energy-usage-graph": "energy/#energy-usage-graph",
  "energy-solar-graph": "energy/#solar-production-graph",
  "energy-gas-graph": "energy/#gas-consumption-graph",
  "energy-water-graph": "energy/#water-consumption-graph",
  "energy-distribution": "energy/#energy-distribution",
  "energy-sources-table": "energy/#energy-sources-table",
  "energy-grid-neutrality-gauge": "energy/#grid-neutrality-gauge",
  "energy-solar-consumed-gauge": "energy/#solar-consumed-gauge",
  "energy-carbon-consumed-gauge": "energy/#carbon-consumed-gauge",
  "energy-self-sufficiency-gauge": "energy/#self-sufficiency-gauge",
  "energy-devices-graph": "energy/#devices-energy-graph",
  "energy-devices-detail-graph": "energy/#detail-devices-energy-graph",
  "energy-sankey": "energy/#sankey-energy-graph",
};

export const getCardDocumentationURL = (
  hass: HomeAssistant,
  type: string
): string | undefined => {
  if (isCustomType(type)) {
    return getCustomCardEntry(stripCustomPrefix(type))?.documentationURL;
  }

  return `${documentationUrl(hass, "/dashboards/")}${NON_STANDARD_URLS[type] || type}`;
};

export const getBadgeDocumentationURL = (
  hass: HomeAssistant,
  type: string
): string | undefined => {
  if (isCustomType(type)) {
    return getCustomBadgeEntry(stripCustomPrefix(type))?.documentationURL;
  }

  return `${documentationUrl(hass, "/dashboards/badges")}`;
};
