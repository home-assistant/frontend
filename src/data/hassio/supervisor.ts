import type { HomeAssistant, PanelInfo } from "../../types";
import type { SupervisorArch } from "../supervisor/supervisor";
import type { AddonState } from "./addon";
import type { HassioResponse } from "./common";

export interface HassioHomeAssistantInfo {
  arch: SupervisorArch;
  audio_input: string | null;
  audio_output: string | null;
  boot: boolean;
  image: string;
  ip_address: string;
  machine: string;
  port: number;
  ssl: boolean;
  update_available: boolean;
  version_latest: string;
  version: string;
  wait_boot: number;
  watchdog: boolean;
}

export interface HassioSupervisorAddonInfo {
  name: string;
  slug: string;
  version: string | null;
  version_latest: string;
  update_available: boolean;
  state: AddonState;
  repository: string;
  icon: boolean;
}

export interface HassioSupervisorRepositoryInfo {
  name: string;
  slug: string;
}

export type SupervisorFeatureFlag =
  "supervisor_v2_api" | "supervisor_websocket_v2_api";

export interface HassioSupervisorInfo {
  addons: HassioSupervisorAddonInfo[];
  addons_repositories: HassioSupervisorRepositoryInfo[];
  arch: SupervisorArch;
  auto_update: boolean;
  channel: string;
  country: string | null;
  debug: boolean;
  debug_block: boolean;
  detect_blocking_io: boolean;
  diagnostics: boolean | null;
  feature_flags: Record<SupervisorFeatureFlag, boolean>;
  healthy: boolean;
  ip_address: string;
  logging: string;
  supported: boolean;
  timezone: string;
  update_available: boolean;
  version: string;
  version_latest: string;
  /** @deprecated No longer used by the Supervisor */
  wait_boot: number;
}

export interface HassioInfo {
  arch: SupervisorArch;
  channel: string;
  docker: string;
  features: string[];
  hassos: string | null;
  homeassistant: string;
  hostname: string | null;
  logging: string;
  machine: string;
  machine_id: string | null;
  state:
    | "initialize"
    | "setup"
    | "startup"
    | "running"
    | "freeze"
    | "shutdown"
    | "stopping"
    | "close";
  operating_system: string | null;
  supervisor: string;
  supported: boolean;
  supported_arch: SupervisorArch[];
  timezone: string;
}

export interface HassioBoots {
  boots: Record<number, string>;
}

export type HassioPanelInfo = PanelInfo<
  | undefined
  | {
      ingress?: string;
    }
>;

export interface SupervisorOptions {
  channel?: "beta" | "dev" | "stable";
  diagnostics?: boolean;
  addons_repositories?: string[];
}

export const reloadSupervisor = async (hass: HomeAssistant) => {
  await hass.callWS({
    type: "supervisor/api",
    endpoint: "/supervisor/reload",
    method: "post",
  });
};

export const restartSupervisor = async (hass: HomeAssistant) => {
  await hass.callWS({
    type: "supervisor/api",
    endpoint: "/supervisor/restart",
    method: "post",
    timeout: null,
  });
};

export const updateSupervisor = async (hass: HomeAssistant) => {
  await hass.callWS({
    type: "supervisor/api",
    endpoint: "/supervisor/update",
    method: "post",
    timeout: null,
  });
};

export const fetchHassioHomeAssistantInfo = async (
  hass: HomeAssistant
): Promise<HassioHomeAssistantInfo> =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: "/core/info",
    method: "get",
  });

export const fetchHassioSupervisorInfo = async (
  hass: HomeAssistant
): Promise<HassioSupervisorInfo> =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: "/supervisor/info",
    method: "get",
  });

export const fetchHassioInfo = async (
  hass: HomeAssistant
): Promise<HassioInfo> =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: "/info",
    method: "get",
  });

export const fetchHassioBoots = async (hass: HomeAssistant) =>
  hass.callApi<HassioResponse<HassioBoots>>("GET", `hassio/host/logs/boots`);

export const fetchHassioLogsLegacy = async (
  hass: HomeAssistant,
  provider: string
) =>
  hass.callApi<string>(
    "GET",
    `hassio/${provider.includes("_") ? `addons/${provider}` : provider}/logs`
  );

export const fetchHassioLogs = async (
  hass: HomeAssistant,
  provider: string,
  range?: string,
  boot = 0
) =>
  hass.callApiRaw(
    "GET",
    `hassio/${provider.includes("_") ? `addons/${provider}` : provider}/logs${boot !== 0 ? `/boots/${boot}` : ""}`,
    undefined,
    range
      ? {
          Range: range,
        }
      : undefined
  );

export const fetchHassioLogsFollow = async (
  hass: HomeAssistant,
  provider: string,
  signal: AbortSignal,
  lines = 100,
  boot = 0
) =>
  hass.callApiRaw(
    "GET",
    `hassio/${provider.includes("_") ? `addons/${provider}` : provider}/logs${boot !== 0 ? `/boots/${boot}` : ""}/follow?lines=${lines}`,
    undefined,
    undefined,
    signal
  );

export const fetchHassioLogsFollowSkip = async (
  hass: HomeAssistant,
  provider: string,
  signal: AbortSignal,
  cursor: string,
  skipLines: number,
  lines = 100,
  boot = 0
) =>
  hass.callApiRaw(
    "GET",
    `hassio/${provider.includes("_") ? `addons/${provider}` : provider}/logs${boot !== 0 ? `/boots/${boot}` : ""}/follow`,
    undefined,
    {
      Range: `entries=${cursor}:${skipLines}:${lines}`,
    },
    signal
  );

export const getHassioLogDownloadUrl = (provider: string) =>
  `/api/hassio/${
    provider.includes("_") ? `addons/${provider}` : provider
  }/logs`;

export const getHassioLogDownloadLinesUrl = (
  provider: string,
  lines: number,
  boot = 0
) =>
  `/api/hassio/${
    provider.includes("_") ? `addons/${provider}` : provider
  }/logs${boot !== 0 ? `/boots/${boot}` : ""}?lines=${lines}`;

export const setSupervisorOption = async (
  hass: HomeAssistant,
  data: SupervisorOptions
) => {
  await hass.callWS({
    type: "supervisor/api",
    endpoint: "/supervisor/options",
    method: "post",
    data,
  });
};

export const coreLatestLogsUrl = "/api/hassio/core/logs/latest";
