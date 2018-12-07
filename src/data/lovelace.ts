import { HomeAssistant } from "../types";

export interface LovelaceConfig {
  _frontendAuto: boolean;
  title?: string;
  views: LovelaceViewConfig[];
}

export interface LovelaceViewConfig {
  index?: number;
  title?: string;
  badges?: string[];
  cards?: LovelaceCardConfig[];
  path?: string;
  icon?: string;
  theme?: string;
}

export interface LovelaceCardConfig {
  index?: number;
  view_index?: number;
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

export const saveConfig = (
  hass: HomeAssistant,
  config: LovelaceConfig
): Promise<void> =>
  hass.callWS({
    type: "lovelace/config/save",
    config,
  });

async function notImplemented() {
  alert("Not implemented yet...");
}

export const updateCardConfig = (
  hass: HomeAssistant,
  config: LovelaceCardConfig
): Promise<void> => notImplemented();

export const deleteCard = (
  hass: HomeAssistant,
  viewIndex: number,
  cardIndex: number
): Promise<void> => notImplemented();

export const addCard = (
  hass: HomeAssistant,
  viewIndex: number,
  config: LovelaceCardConfig
): Promise<void> => notImplemented();

export const updateViewConfig = (
  hass: HomeAssistant,
  config: LovelaceViewConfig
): Promise<void> => notImplemented();

export const deleteView = (
  hass: HomeAssistant,
  viewIndex: number
): Promise<void> => notImplemented();

export const addView = (
  hass: HomeAssistant,
  config: LovelaceViewConfig
): Promise<void> => notImplemented();
