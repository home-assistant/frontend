import { HomeAssistant } from "../types";

export interface LovelaceConfig {
  _frontendAuto: boolean;
  title?: string;
  views: LovelaceViewConfig[];
}

export interface LovelaceViewConfig {
  title?: string;
  badges?: string[];
  cards?: LovelaceCardConfig[];
  id?: string;
  icon?: string;
}

export interface LovelaceCardConfig {
  id?: string;
  type: string;
  [key: string]: any;
}

export const fetchConfig = (hass: HomeAssistant): Promise<LovelaceConfig> =>
  hass.callWS({
    type: "lovelace/config",
  });

export const migrateConfig = (hass: HomeAssistant): Promise<void> =>
  hass.callWS({
    type: "lovelace/config/migrate",
  });

export const saveConfig = (
  hass: HomeAssistant,
  config: LovelaceConfig | string,
  configFormat: "json" | "yaml"
): Promise<void> =>
  hass.callWS({
    type: "lovelace/config/save",
    config,
    format: configFormat,
  });

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

export const deleteCard = (
  hass: HomeAssistant,
  cardId: string
): Promise<void> =>
  hass.callWS({
    type: "lovelace/config/card/delete",
    card_id: cardId,
  });
