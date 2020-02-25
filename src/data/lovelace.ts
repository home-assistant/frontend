import { HomeAssistant } from "../types";
import {
  Connection,
  getCollection,
  HassEventBase,
} from "home-assistant-js-websocket";
import { HASSDomEvent } from "../common/dom/fire_event";

export interface LovelaceConfig {
  title?: string;
  views: LovelaceViewConfig[];
  background?: string;
}

export type LovelaceResources = Array<{
  type: "css" | "js" | "module" | "html";
  url: string;
}>;

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

export interface CustomActionConfig extends BaseActionConfig {
  action: "fire-dom-event";
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
  | NoActionConfig
  | CustomActionConfig;

type LovelaceUpdatedEvent = HassEventBase & {
  event_type: "lovelace_updated";
  data: {
    url_path: string | null;
    mode: "yaml" | "storage";
  };
};

export const fetchResources = (conn: Connection): Promise<LovelaceResources> =>
  conn.sendMessagePromise({
    type: "lovelace/resources",
  });
export const fetchConfig = (
  conn: Connection,
  urlPath: string | null,
  force: boolean
): Promise<LovelaceConfig> =>
  conn.sendMessagePromise({
    type: "lovelace/config",
    url_path: urlPath,
    force,
  });
export const saveConfig = (
  hass: HomeAssistant,
  urlPath: string | null,
  config: LovelaceConfig
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

export const subscribeLovelaceUpdates = (
  conn: Connection,
  urlPath: string | null,
  onChange: () => void
) =>
  conn.subscribeEvents<LovelaceUpdatedEvent>((ev) => {
    if (ev.data.url_path === urlPath) {
      onChange();
    }
  }, "lovelace_updated");

export const getLovelaceCollection = (
  conn: Connection,
  urlPath: string | null = null
) =>
  getCollection(
    conn,
    `_lovelace_${urlPath ?? ""}`,
    (conn2) => fetchConfig(conn2, urlPath, false),
    (_conn, store) =>
      subscribeLovelaceUpdates(conn, urlPath, () =>
        fetchConfig(conn, urlPath, false).then((config) =>
          store.setState(config, true)
        )
      )
  );

export interface WindowWithLovelaceProm extends Window {
  llConfProm?: Promise<LovelaceConfig>;
  llResProm?: Promise<LovelaceResources>;
}

export interface ActionHandlerOptions {
  hasHold?: boolean;
  hasDoubleClick?: boolean;
}

export interface ActionHandlerDetail {
  action: string;
}

export type ActionHandlerEvent = HASSDomEvent<ActionHandlerDetail>;
