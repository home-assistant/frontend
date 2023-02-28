import {
  getCustomCardEntry,
  isCustomType,
  stripCustomPrefix,
} from "../../../data/lovelace_custom_cards";
import { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";

export const getCardDocumentationURL = (
  hass: HomeAssistant,
  type: string
): string | undefined => {
  if (isCustomType(type)) {
    return getCustomCardEntry(stripCustomPrefix(type))?.documentationURL;
  }

  return `${documentationUrl(hass, "/lovelace/")}${type}`;
};
