import { promiseTimeout } from "../../../common/util/promise-timeout";
import { HuiCard } from "../cards/hui-card";
import { LovelaceCard, LovelaceHeaderFooter } from "../types";

export const computeCardSize = (
  card: LovelaceCard | LovelaceHeaderFooter | HuiCard
): number | Promise<number> => {
  if (typeof card.getCardSize === "function") {
    try {
      return promiseTimeout(500, card.getCardSize()).catch(
        () => 1
      ) as Promise<number>;
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
