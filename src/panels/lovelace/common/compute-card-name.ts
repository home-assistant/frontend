import { LocalizeFunc } from "../../../common/translations/localize";
import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import {
  getCustomCardEntry,
  isCustomType,
  stripCustomPrefix,
} from "../../../data/lovelace_custom_cards";

export const computeCardName = (
  config: LovelaceCardConfig,
  localize: LocalizeFunc
): string | undefined => {
  if (isCustomType(config.type)) {
    // prettier-ignore
    let cardName = getCustomCardEntry(
          stripCustomPrefix(config.type)
        )?.name;
    // Trim names that end in " Card" so as not to redundantly duplicate it
    if (cardName?.toLowerCase().endsWith(" card")) {
      cardName = cardName.substring(0, cardName.length - 5);
    }
    return cardName;
  }
  return localize(`ui.panel.lovelace.editor.card.${config.type}.name`);
};
