import { LovelaceCard } from "../types";

export const computeCardSize = async (card: LovelaceCard): Promise<number> => {
  if (typeof card.getCardSize === "function") {
    return card.getCardSize();
  }
  if (customElements.get(card.localName)) {
    return 1;
  }
  return customElements.whenDefined(card.localName).then(() => {
    return computeCardSize(card);
  });
};
