import { LovelaceCard, LovelaceHeaderFooter } from "../types";

export const computeCardSize = (
  card: LovelaceCard | LovelaceHeaderFooter
): number | Promise<number> => {
  if (typeof card.getCardSize === "function") {
    return card.getCardSize();
  }
  if (customElements.get(card.localName)) {
    return 1;
  }
  return customElements
    .whenDefined(card.localName)
    .then(() => computeCardSize(card));
};
