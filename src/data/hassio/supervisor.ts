import { HomeAssistant, PanelInfo } from "../../types";
import { SupervisorArch } from "../supervisor/supervisor";
import { HassioAddonInfo, HassioAddonRepository } from "./addon";
import { hassioApiResultExtractor, HassioResponse } from "./common";

export type HassioHomeAssistantInfo = {
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
};

export type HassioSupervisorInfo = {
  addons: HassioAddonInfo[];
  addons_repositories: HassioAddonRepository[];
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
};

export type HassioInfo = {
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
};

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
  await hass.callApi<HassioResponse<void>>("POST", `hassio/supervisor/reload`);
};

export const restartSupervisor = async (hass: HomeAssistant) => {
  await hass.callApi<HassioResponse<void>>("POST", `hassio/supervisor/restart`);
};

export const updateSupervisor = async (hass: HomeAssistant) => {
  await hass.callApi<HassioResponse<void>>("POST", `hassio/supervisor/update`);
};

export const fetchHassioHomeAssistantInfo = async (hass: HomeAssistant) => {
  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioHomeAssistantInfo>>(
      "GET",
      "hassio/core/info"
    )
  );
};

export const fetchHassioSupervisorInfo = async (hass: HomeAssistant) => {
  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioSupervisorInfo>>(
      "GET",
      "hassio/supervisor/info"
    )
  );
};

export const fetchHassioInfo = async (hass: HomeAssistant) => {
  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioInfo>>("GET", "hassio/info")
  );
};

export const fetchHassioLogs = async (
  hass: HomeAssistant,
  provider: string
) => {
  return hass.callApi<string>("GET", `hassio/${provider}/logs`);
};

export const setSupervisorOption = async (
  hass: HomeAssistant,
  data: SupervisorOptions
) => {
  await hass.callApi<HassioResponse<void>>(
    "POST",
    "hassio/supervisor/options",
    data
  );
};
