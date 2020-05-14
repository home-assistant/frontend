import { coreCards } from "./lovelace-cards";
import {
  getCustomCardEntry,
  customCards,
} from "../../../data/lovelace_custom_cards";

export const findCardDocumentationURL = (type: string): string | undefined => {
  const coreCard = coreCards.find((c) => c.type === type);

  if (!coreCard && customCards.length > 0) {
    return getCustomCardEntry(type)?.documentationURL;
  }
  return coreCard?.documentationURL;
};
