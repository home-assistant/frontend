import type { Connection } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../../../types";
import type { LovelaceResource } from "../resource";
import type { LovelaceStrategyConfig } from "./strategy";
import type { LovelaceViewRawConfig } from "./view";

export interface LovelaceDashboardBaseConfig {}

export interface LovelaceConfig extends LovelaceDashboardBaseConfig {
  title?: string;
  background?: string;
  views: LovelaceViewRawConfig[];
}

export interface LovelaceDashboardStrategyConfig
  extends LovelaceDashboardBaseConfig {
  strategy: LovelaceStrategyConfig;
}

export interface LegacyLovelaceConfig extends LovelaceConfig {
  resources?: LovelaceResource[];
}

export type LovelaceRawConfig =
  | LovelaceConfig
  | LovelaceDashboardStrategyConfig;

export function isStrategyDashboard(
  config: LovelaceRawConfig
): config is LovelaceDashboardStrategyConfig {
  return "strategy" in config;
}

export const fetchConfig = (
  conn: Connection,
  urlPath: string | null,
  force: boolean
): Promise<LovelaceRawConfig> =>
  conn.sendMessagePromise({
    type: "lovelace/config",
    url_path: urlPath,
    force,
  });

export const saveConfig = (
  hass: HomeAssistant,
  urlPath: string | null,
  config: LovelaceRawConfig
): Promise<void> =>
  hass.callWS({
    type: "lovelace/config/save",
    url_path: urlPath,
    config,
  });

export const deleteConfig = (
  hass: HomeAssistant,
  urlPath: string | null
): Promise<void> =>
  hass.callWS({
    type: "lovelace/config/delete",
    url_path: urlPath,
  });
