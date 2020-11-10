import {
  Connection,
  getCollection,
  HassEventBase,
} from "home-assistant-js-websocket";
import { HASSDomEvent } from "../common/dom/fire_event";
import { HuiErrorCard } from "../panels/lovelace/cards/hui-error-card";
import {
  Lovelace,
  LovelaceBadge,
  LovelaceCard,
} from "../panels/lovelace/types";
import { HomeAssistant } from "../types";

export interface LovelacePanelConfig {
  mode: "yaml" | "storage";
}

export interface LovelaceConfig {
  title?: string;
  views: LovelaceViewConfig[];
  background?: string;
}

export interface LegacyLovelaceConfig extends LovelaceConfig {
  resources?: LovelaceResource[];
}

export interface LovelaceResource {
  id: string;
  type: "css" | "js" | "module" | "html";
  url: string;
}

export interface LovelaceResourcesMutableParams {
  res_type: LovelaceResource["type"];
  url: string;
}

export type LovelaceDashboard =
  | LovelaceYamlDashboard
  | LovelaceStorageDashboard;

interface LovelaceGenericDashboard {
  id: string;
  url_path: string;
  require_admin: boolean;
  show_in_sidebar: boolean;
  icon?: string;
  title: string;
}

export interface LovelaceYamlDashboard extends LovelaceGenericDashboard {
  mode: "yaml";
  filename: string;
}

export interface LovelaceStorageDashboard extends LovelaceGenericDashboard {
  mode: "storage";
}

export interface LovelaceDashboardMutableParams {
  require_admin: boolean;
  show_in_sidebar: boolean;
  icon?: string;
  title: string;
}

export interface LovelaceDashboardCreateParams
  extends LovelaceDashboardMutableParams {
  url_path: string;
  mode: "storage";
}

export interface LovelaceViewConfig {
  index?: number;
  title?: string;
  type?: string;
  badges?: Array<string | LovelaceBadgeConfig>;
  cards?: LovelaceCardConfig[];
  path?: string;
  icon?: string;
  theme?: string;
  panel?: boolean;
  background?: string;
  visible?: boolean | ShowViewConfig[];
}

export interface LovelaceViewElement extends HTMLElement {
  hass?: HomeAssistant;
  lovelace?: Lovelace;
  narrow?: boolean;
  index?: number;
  cards?: Array<LovelaceCard | HuiErrorCard>;
  badges?: LovelaceBadge[];
  setConfig(config: LovelaceViewConfig): void;
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
  layout?: any;
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

export const fetchResources = (conn: Connection): Promise<LovelaceResource[]> =>
  conn.sendMessagePromise({
    type: "lovelace/resources",
  });

export const createResource = (
  hass: HomeAssistant,
  values: LovelaceResourcesMutableParams
) =>
  hass.callWS<LovelaceResource>({
    type: "lovelace/resources/create",
    ...values,
  });

export const updateResource = (
  hass: HomeAssistant,
  id: string,
  updates: Partial<LovelaceResourcesMutableParams>
) =>
  hass.callWS<LovelaceResource>({
    type: "lovelace/resources/update",
    resource_id: id,
    ...updates,
  });

export const deleteResource = (hass: HomeAssistant, id: string) =>
  hass.callWS({
    type: "lovelace/resources/delete",
    resource_id: id,
  });

export const fetchDashboards = (
  hass: HomeAssistant
): Promise<LovelaceDashboard[]> =>
  hass.callWS({
    type: "lovelace/dashboards/list",
  });

export const createDashboard = (
  hass: HomeAssistant,
  values: LovelaceDashboardCreateParams
) =>
  hass.callWS<LovelaceDashboard>({
    type: "lovelace/dashboards/create",
    ...values,
  });

export const updateDashboard = (
  hass: HomeAssistant,
  id: string,
  updates: Partial<LovelaceDashboardMutableParams>
) =>
  hass.callWS<LovelaceDashboard>({
    type: "lovelace/dashboards/update",
    dashboard_id: id,
    ...updates,
  });

export const deleteDashboard = (hass: HomeAssistant, id: string) =>
  hass.callWS({
    type: "lovelace/dashboards/delete",
    dashboard_id: id,
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

// Legacy functions to support cast for Home Assistion < 0.107
const fetchLegacyConfig = (
  conn: Connection,
  force: boolean
): Promise<LovelaceConfig> =>
  conn.sendMessagePromise({
    type: "lovelace/config",
    force,
  });

const subscribeLegacyLovelaceUpdates = (
  conn: Connection,
  onChange: () => void
) => conn.subscribeEvents(onChange, "lovelace_updated");

export const getLegacyLovelaceCollection = (conn: Connection) =>
  getCollection(
    conn,
    "_lovelace",
    (conn2) => fetchLegacyConfig(conn2, false),
    (_conn, store) =>
      subscribeLegacyLovelaceUpdates(conn, () =>
        fetchLegacyConfig(conn, false).then((config) =>
          store.setState(config, true)
        )
      )
  );

export interface WindowWithLovelaceProm extends Window {
  llConfProm?: Promise<LovelaceConfig>;
  llResProm?: Promise<LovelaceResource[]>;
}

export interface ActionHandlerOptions {
  hasHold?: boolean;
  hasDoubleClick?: boolean;
  disabled?: boolean;
}

export interface ActionHandlerDetail {
  action: "hold" | "tap" | "double_tap";
}

export type ActionHandlerEvent = HASSDomEvent<ActionHandlerDetail>;
