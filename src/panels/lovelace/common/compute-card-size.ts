import { LovelaceCard } from "../types";

export const computeCardSize = async (card: LovelaceCard): Promise<number> => {
  if (typeof card.getCardSize === "function") {
    return card.getCardSize();
  }
  if (customElements.get(card.localName)) {
    return 1;
  }
  await customElements.whenDefined(card.localName);
  return computeCardSize(card);
};
