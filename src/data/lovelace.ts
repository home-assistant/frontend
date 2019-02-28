import { HomeAssistant } from "../types";

export interface LovelaceConfig {
  title?: string;
  views: LovelaceViewConfig[];
  background?: string;
  resources?: Array<{ type: "css" | "js" | "module" | "html"; url: string }>;
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

export interface ToggleActionConfig {
  action: "toggle";
}

export interface CallServiceActionConfig {
  action: "call-service";
  service: string;
  service_data?: {
    entity_id?: string | [string];
    [key: string]: any;
  };
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

export interface Condition {
  entity: string;
  state?: string;
  state_not?: string;
}
