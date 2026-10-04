import type { LovelaceCardConfig } from "../../../src/data/lovelace/config/card";
import { getCardElementClass } from "../../../src/panels/lovelace/create-element/create-card-element";

export const validateCardConfig = async (config: LovelaceCardConfig) => {
  const cardClass = await getCardElementClass(config.type);
  new cardClass().setConfig(config);
};
