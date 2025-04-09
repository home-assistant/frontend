import type { HomeAssistant } from "../../../types";

import {
  getCustomBadgeEntry,
  getCustomCardEntry,
  isCustomType,
  stripCustomPrefix,
} from "../../../data/lovelace_custom_cards";
import { documentationUrl } from "../../../util/documentation-url";

export const getCardDocumentationURL = (
  hass: HomeAssistant,
  type: string
): string | undefined => {
  if (isCustomType(type)) {
    return getCustomCardEntry(stripCustomPrefix(type))?.documentationURL;
  }

  return `${documentationUrl(hass, "/dashboards/")}${type}`;
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
