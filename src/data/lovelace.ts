import { HomeAssistant } from "../types";
import { Connection, getCollection } from "home-assistant-js-websocket";
import { HASSDomEvent } from "../common/dom/fire_event";

export interface LovelaceConfig {
  title?: string;
  views: LovelaceViewConfig[];
  background?: string;
  resources?: Array<{ type: "css" | "js" | "module" | "html"; url: string }>;
}

export interface LovelaceViewConfig {
  index?: number;
  title?: string;
  badges?: Array<string | LovelaceBadgeConfig>;
  cards?: LovelaceCardConfig[];
  path?: string;
  icon?: string;
  theme?: string;
  panel?: boolean;
  background?: string;
  visible?: boolean | ShowViewConfig[];
}

export interface ShowViewConfig {
  user?: string;
}

export interface LovelaceBadgeConfig {
  type?: string;
  [key: string]: any;
}

export interface LovelaceCardConfig {
  index?: number;
  view_index?: number;
  type: string;
  [key: string]: any;
}

export interface ToggleActionConfig extends BaseActionConfig {
  action: "toggle";
}

export interface CallServiceActionConfig extends BaseActionConfig {
  action: "call-service";
  service: string;
  service_data?: {
    entity_id?: string | [string];
    [key: string]: any;
  };
}

export interface NavigateActionConfig extends BaseActionConfig {
  action: "navigate";
  navigation_path: string;
}

export interface UrlActionConfig extends BaseActionConfig {
  action: "url";
  url_path: string;
}

export interface MoreInfoActionConfig extends BaseActionConfig {
  action: "more-info";
}

export interface NoActionConfig extends BaseActionConfig {
  action: "none";
}

export interface BaseActionConfig {
  confirmation?: ConfirmationRestrictionConfig;
}

export interface ConfirmationRestrictionConfig {
  text?: string;
  exemptions?: RestrictionConfig[];
}

export interface RestrictionConfig {
  user: string;
}

export type ActionConfig =
  | ToggleActionConfig
  | CallServiceActionConfig
  | NavigateActionConfig
  | UrlActionConfig
  | MoreInfoActionConfig
  | NoActionConfig;

export const fetchConfig = (
  conn: Connection,
  force: boolean
): Promise<LovelaceConfig> =>
  conn.sendMessagePromise({
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

export const subscribeLovelaceUpdates = (
  conn: Connection,
  onChange: () => void
) => conn.subscribeEvents(onChange, "lovelace_updated");

export const getLovelaceCollection = (conn: Connection) =>
  getCollection(
    conn,
    "_lovelace",
    (conn2) => fetchConfig(conn2, false),
    (_conn, store) =>
      subscribeLovelaceUpdates(conn, () =>
        fetchConfig(conn, false).then((config) => store.setState(config, true))
      )
  );

export interface WindowWithLovelaceProm extends Window {
  llConfProm?: Promise<LovelaceConfig>;
}

export interface ActionHandlerOptions {
  hasHold?: boolean;
  hasDoubleClick?: boolean;
}

export interface ActionHandlerDetail {
  action: string;
}

export type ActionHandlerEvent = HASSDomEvent<ActionHandlerDetail>;
