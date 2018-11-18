import { LovelaceCard } from "../types";

export const computeCardSize = (card: LovelaceCard): number => {
  return typeof card.getCardSize === "function" ? card.getCardSize() : 1;
};
