import { atLeastVersion } from "../../common/config/version";
import type { HomeAssistant, PanelInfo } from "../../types";
import type { SupervisorArch } from "../supervisor/supervisor";
import type { HassioResponse } from "./common";
import { hassioApiResultExtractor } from "./common";

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

export interface HassioSupervisorInfo {
  addons: string[];
  addons_repositories: string[];
  arch: SupervisorArch;
  channel: string;
  debug: boolean;
  debug_block: boolean;
  diagnostics: boolean | null;
  healthy: boolean;
  ip_address: string;
  logging: string;
  supported: boolean;
  timezone: string;
  update_available: boolean;
  version: string;
  version_latest: string;
  wait_boot: number;
}

export interface HassioInfo {
  arch: SupervisorArch;
  channel: string;
  docker: string;
  features: string[];
  hassos: null;
  homeassistant: string;
  hostname: string;
  logging: string;
  machine: string;
  state:
    | "initialize"
    | "setup"
    | "startup"
    | "running"
    | "freeze"
    | "shutdown"
    | "stopping"
    | "close";
  operating_system: string;
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

export interface CreateSessionResponse {
  session: string;
}

export interface SupervisorOptions {
  channel?: "beta" | "dev" | "stable";
  diagnostics?: boolean;
  addons_repositories?: string[];
}

export const reloadSupervisor = async (hass: HomeAssistant) => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    await hass.callWS({
      type: "supervisor/api",
      endpoint: "/supervisor/reload",
      method: "post",
    });
    return;
  }

  await hass.callApi<HassioResponse<void>>("POST", `hassio/supervisor/reload`);
};

export const restartSupervisor = async (hass: HomeAssistant) => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    await hass.callWS({
      type: "supervisor/api",
      endpoint: "/supervisor/restart",
      method: "post",
      timeout: null,
    });
    return;
  }

  await hass.callApi<HassioResponse<void>>("POST", `hassio/supervisor/restart`);
};

export const updateSupervisor = async (hass: HomeAssistant) => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    await hass.callWS({
      type: "supervisor/api",
      endpoint: "/supervisor/update",
      method: "post",
      timeout: null,
    });
    return;
  }

  await hass.callApi<HassioResponse<void>>("POST", `hassio/supervisor/update`);
};

export const fetchHassioHomeAssistantInfo = async (
  hass: HomeAssistant
): Promise<HassioHomeAssistantInfo> => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    return hass.callWS({
      type: "supervisor/api",
      endpoint: "/core/info",
      method: "get",
    });
  }

  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioHomeAssistantInfo>>(
      "GET",
      "hassio/core/info"
    )
  );
};

export const fetchHassioSupervisorInfo = async (
  hass: HomeAssistant
): Promise<HassioSupervisorInfo> => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    return hass.callWS({
      type: "supervisor/api",
      endpoint: "/supervisor/info",
      method: "get",
    });
  }

  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioSupervisorInfo>>(
      "GET",
      "hassio/supervisor/info"
    )
  );
};

export const fetchHassioInfo = async (
  hass: HomeAssistant
): Promise<HassioInfo> => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    return hass.callWS({
      type: "supervisor/api",
      endpoint: "/info",
      method: "get",
    });
  }

  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioInfo>>("GET", "hassio/info")
  );
};

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
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    await hass.callWS({
      type: "supervisor/api",
      endpoint: "/supervisor/options",
      method: "post",
      data,
    });
    return;
  }

  await hass.callApi<HassioResponse<void>>(
    "POST",
    "hassio/supervisor/options",
    data
  );
};

export const coreLatestLogsUrl = "/api/hassio/core/logs/latest";
