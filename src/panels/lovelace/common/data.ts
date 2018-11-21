import { HomeAssistant } from "../../../types";
import { LovelaceConfig } from "../types";

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
  config: LovelaceConfig | string,
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
