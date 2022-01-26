import { LovelaceCard, LovelaceHeaderFooter } from "../types";

export const computeCardSize = (
  card: LovelaceCard | LovelaceHeaderFooter
): number | Promise<number> => {
  if (typeof card.getCardSize === "function") {
    try {
      const cardSize = card.getCardSize();
      const timeOut = new Promise((resolve) =>
        setTimeout(() => resolve(1), 500)
      );
      return Promise.race([cardSize, timeOut]) as Promise<number>;
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
