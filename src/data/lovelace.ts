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
  theme?: string;
}

export interface LovelaceCardConfig {
  id?: string;
  type: string;
  [key: string]: any;
}

export interface ToggleActionConfig {
  action: "toggle";
}

export interface CallServiceActionConfig {
  action: "call-service";
  service: string;
  service_data?: { [key: string]: any };
}

export interface NavigateActionConfig {
  action: "navigate";
  navigation_path: string;
}

export interface MoreInfoActionConfig {
  action: "more-info";
}

export interface NoActionConfig {
  action: "none";
}

export type ActionConfig =
  | ToggleActionConfig
  | CallServiceActionConfig
  | NavigateActionConfig
  | MoreInfoActionConfig
  | NoActionConfig;

export const fetchConfig = (
  hass: HomeAssistant,
  force: boolean
): Promise<LovelaceConfig> =>
  hass.callWS({
    type: "lovelace/config",
    force,
  });

export const migrateConfig = (hass: HomeAssistant): Promise<void> =>
  hass.callWS({
    type: "lovelace/config/migrate",
  });

export const saveConfig = (
  hass: HomeAssistant,
  config: LovelaceConfig | string
): Promise<void> =>
  hass.callWS({
    type: "lovelace/config/save",
    config,
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
  format: "json" | "yaml"
): Promise<void> =>
  hass.callWS({
    type: "lovelace/config/card/update",
    card_id: cardId,
    card_config: config,
    format,
  });

export const deleteCard = (
  hass: HomeAssistant,
  cardId: string
): Promise<void> =>
  hass.callWS({
    type: "lovelace/config/card/delete",
    card_id: cardId,
  });

export const addCard = (
  hass: HomeAssistant,
  viewId: string,
  config: LovelaceCardConfig | string,
  format: "json" | "yaml"
): Promise<void> =>
  hass.callWS({
    type: "lovelace/config/card/add",
    view_id: viewId,
    card_config: config,
    format,
  });

export const updateViewConfig = (
  hass: HomeAssistant,
  viewId: string,
  config: LovelaceViewConfig | string,
  format: "json" | "yaml"
): Promise<void> =>
  hass.callWS({
    type: "lovelace/config/view/update",
    view_id: viewId,
    view_config: config,
    format,
  });

export const deleteView = (
  hass: HomeAssistant,
  viewId: string
): Promise<void> =>
  hass.callWS({
    type: "lovelace/config/view/delete",
    view_id: viewId,
  });

export const addView = (
  hass: HomeAssistant,
  config: LovelaceViewConfig | string,
  format: "json" | "yaml"
): Promise<void> =>
  hass.callWS({
    type: "lovelace/config/view/add",
    view_config: config,
    format,
  });
