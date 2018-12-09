import {
  saveConfig,
  LovelaceConfig,
  LovelaceCardConfig,
  LovelaceViewConfig,
} from "../../../data/lovelace";
import { Lovelace } from "../types";
import { HomeAssistant } from "../../../types";

export const generateLovelace = (
  hass: HomeAssistant,
  config: LovelaceConfig,
  autoGen: boolean,
  legacy: boolean
): Lovelace => {
  return {
    hass,
    config,
    editMode: false,
    autoGen,
    legacy,
    async save(newConfig: LovelaceConfig): Promise<void> {
      try {
        await saveConfig(this.hass, newConfig);
        this.config = newConfig;
      } catch (err) {
        window.alert(`Error saving: ${err.message}`);
      }
    },
    async addCard(
      path: [number],
      cardConfig: LovelaceCardConfig
    ): Promise<void> {
      const [viewIndex] = path;
      const views: LovelaceViewConfig[] = [];

      this.config.views.forEach((viewConf, index) => {
        if (index !== viewIndex) {
          views.push(config.views[index]);
          return;
        }

        const cards = viewConf.cards
          ? [...viewConf.cards, cardConfig]
          : [cardConfig];

        views.push({
          ...viewConf,
          cards,
        });
      });

      this.save({
        ...config,
        views,
      });
    },
    async deleteCard(path: [number, number]): Promise<void> {
      const [viewIndex, cardIndex] = path;
      const views: LovelaceViewConfig[] = [];

      this.config.views.forEach((viewConf, index) => {
        if (index !== viewIndex) {
          views.push(config.views[index]);
          return;
        }

        views.push({
          ...viewConf,
          cards: (viewConf.cards || []).filter(
            (_origConf, ind) => ind !== cardIndex
          ),
        });
      });

      this.save({
        ...config,
        views,
      });
    },
  };
};
