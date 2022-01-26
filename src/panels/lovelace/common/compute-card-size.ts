import { LovelaceCard, LovelaceHeaderFooter } from "../types";

export const computeCardSize = (
  card: LovelaceCard | LovelaceHeaderFooter
): number | Promise<number> => {
  if (typeof card.getCardSize === "function") {
    try {
      return card.getCardSize();
    } catch (_e: any) {
      return 1;
    }
  }
  if (customElements.get(card.localName)) {
    return 1;
  }
  return customElements
    .whenDefined(card.localName)
    .then(() => computeCardSize(card));
};
