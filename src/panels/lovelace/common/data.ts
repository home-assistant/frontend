import { HomeAssistant } from "../../../types";
import { LovelaceCardConfig } from "../types";

export const getCardConfig = (
  hass: HomeAssistant,
  cardId: string
): Promise<string> =>
  hass.callWS({
    type: "lovelace/config/card/get",
    card_id: cardId,
  });

export const updateCardConfig = (
  hass: HomeAssistant,
  cardId: string,
  config: LovelaceCardConfig | string,
  configFormat: "json" | "yaml"
): Promise<void> =>
  hass.callWS({
    type: "lovelace/config/card/update",
    card_id: cardId,
    card_config: config,
    format: configFormat,
  });

export const migrateConfig = (hass: HomeAssistant): Promise<void> =>
  hass.callWS({
    type: "lovelace/config/migrate",
  });
