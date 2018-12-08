import { LovelaceConfig } from "../../../data/lovelace";

export const formatLovelaceConfig = (
  config: LovelaceConfig
): LovelaceConfig => {
  config.views.forEach((view, viewIndex) => {
    view.index = viewIndex;
    if (view.cards) {
      view.cards.forEach((card, cardIndex) => {
        card.view_index = viewIndex;
        card.index = cardIndex;
      });
    }
  });

  return config;
};
