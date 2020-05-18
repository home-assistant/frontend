import {
  getCustomCardEntry,
  CUSTOM_TYPE_PREFIX,
} from "../../../data/lovelace_custom_cards";

const coreDocumentationURLBase = "https://www.home-assistant.io/lovelace/";

export const getCardDocumentationURL = (type: string): string | undefined => {
  if (type.startsWith(CUSTOM_TYPE_PREFIX)) {
    return getCustomCardEntry(type)?.documentationURL;
  }

  return `${coreDocumentationURLBase}${type}`;
};
