import { Connection, createCollection } from "home-assistant-js-websocket";
import { LocalizeFunc } from "../common/translations/localize";
import { HomeAssistant } from "../types";
import { debounce } from "../common/util/debounce";

export const integrationsWithPanel = {
  matter: "config/matter",
  mqtt: "config/mqtt",
  thread: "config/thread",
  zha: "config/zha/dashboard",
  zwave_js: "config/zwave_js/dashboard",
};

export type IntegrationType =
  | "device"
  | "helper"
  | "hub"
  | "service"
  | "hardware";

export interface IntegrationManifest {
  is_built_in: boolean;
  domain: string;
  name: string;
  config_flow: boolean;
  documentation: string;
  issue_tracker?: string;
  dependencies?: string[];
  after_dependencies?: string[];
  codeowners?: string[];
  requirements?: string[];
  ssdp?: Array<{ manufacturer?: string; modelName?: string; st?: string }>;
  zeroconf?: string[];
  homekit?: { models: string[] };
  integration_type?: IntegrationType;
  loggers?: string[];
  quality_scale?: "gold" | "internal" | "platinum" | "silver";
  iot_class:
    | "assumed_state"
    | "cloud_polling"
    | "cloud_push"
    | "local_polling"
    | "local_push";
}
export interface IntegrationSetup {
  domain: string;
  seconds?: number;
}

export interface IntegrationLogInfo {
  domain: string;
  level?: number;
}

export enum LogSeverity {
  CRITICAL = 50,
  ERROR = 40,
  WARNING = 30,
  INFO = 20,
  DEBUG = 10,
  NOTSET = 0,
}

export type IntegrationLogPersistance = "none" | "once" | "permanent";

export const integrationIssuesUrl = (
  domain: string,
  manifest: IntegrationManifest
) =>
  manifest.issue_tracker ||
  `https://github.com/home-assistant/core/issues?q=is%3Aissue+is%3Aopen+label%3A%22integration%3A+${domain}%22`;

export const domainToName = (
  localize: LocalizeFunc,
  domain: string,
  manifest?: IntegrationManifest
) => localize(`component.${domain}.title`) || manifest?.name || domain;

export const fetchIntegrationManifests = (
  hass: HomeAssistant,
  integrations?: string[]
) => {
  const params: any = {
    type: "manifest/list",
  };
  if (integrations) {
    params.integrations = integrations;
  }
  return hass.callWS<IntegrationManifest[]>(params);
};

export const fetchIntegrationManifest = (
  hass: HomeAssistant,
  integration: string
) => hass.callWS<IntegrationManifest>({ type: "manifest/get", integration });

export const fetchIntegrationSetups = (hass: HomeAssistant) =>
  hass.callWS<IntegrationSetup[]>({ type: "integration/setup_info" });

export const fetchIntegrationLogInfo = (conn) =>
  conn.sendMessagePromise({
    type: "logger/log_info",
  });

export const setIntegrationLogLevel = (
  hass: HomeAssistant,
  integration: string,
  level: string,
  persistence: IntegrationLogPersistance
) =>
  hass.callWS({
    type: "logger/integration_log_level",
    integration,
    level,
    persistence,
  });

const subscribeLogInfoUpdates = (conn, store) =>
  conn.subscribeEvents(
    debounce(
      () =>
        fetchIntegrationLogInfo(conn).then((log_infos) =>
          store.setState(log_infos, true)
        ),
      200,
      true
    ),
    "logging_changed"
  );

export const subscribeLogInfo = (
  conn: Connection,
  onChange: (devices: IntegrationLogInfo[]) => void
) =>
  createCollection<IntegrationLogInfo[]>(
    "_integration_log_info",
    fetchIntegrationLogInfo,
    subscribeLogInfoUpdates,
    conn,
    onChange
  );
