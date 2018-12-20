import { HomeAssistant } from "../types";

export interface LovelaceConfig {
  title?: string;
  views: LovelaceViewConfig[];
  background?: string;
  resources?: Array<{ type: "css" | "js" | "module" | "html"; url: string }>;
  excluded_entities?: string[];
}

export interface LovelaceViewConfig {
  index?: number;
  title?: string;
  badges?: string[];
  cards?: LovelaceCardConfig[];
  path?: string;
  icon?: string;
  theme?: string;
  panel?: boolean;
  background?: string;
}

export interface LovelaceCardConfig {
  index?: number;
  view_index?: number;
  type: string;
  [key: string]: any;
}

export interface ToggleActionConfig extends ActionBaseConfig {
  action: "toggle";
}

export interface CallServiceActionConfig extends ActionBaseConfig {
  action: "call-service";
  service: string;
  service_data?: { [key: string]: any };
}

export interface NavigateActionConfig extends ActionBaseConfig {
  action: "navigate";
  navigation_path: string;
}

export interface MoreInfoActionConfig extends ActionBaseConfig {
  action: "more-info";
}

export interface NoActionConfig extends ActionBaseConfig {
  action: "none";
}

export interface ActionBaseConfig {
  toast?: boolean;
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
