import { HomeAssistant } from "../../types";
import { HassioResponse, hassioApiResultExtractor } from "./common";

export interface HassioAddonInfo {
  name: string;
  slug: string;
  description: string;
  repository: "core" | "local" | string;
  version: string;
  state: "none" | "started" | "stopped";
  installed: string | undefined;
  detached: boolean;
  available: boolean;
  build: boolean;
  url: string | null;
  icon: boolean;
  logo: boolean;
}

export interface HassioAddonDetails extends HassioAddonInfo {
  name: string;
  slug: string;
  description: string;
  long_description: null | string;
  auto_update: boolean;
  url: null | string;
  detached: boolean;
  available: boolean;
  arch: "armhf" | "aarch64" | "i386" | "amd64";
  machine: any;
  homeassistant: string;
  last_version: string;
  boot: "auto" | "manual";
  build: boolean;
  options: object;
  network: null | object;
  network_description: null | object;
  host_network: boolean;
  host_pid: boolean;
  host_ipc: boolean;
  host_dbus: boolean;
  privileged: any;
  apparmor: "disable" | "default" | "profile";
  devices: string[];
  auto_uart: boolean;
  icon: boolean;
  logo: boolean;
  changelog: boolean;
  hassio_api: boolean;
  hassio_role: "default" | "homeassistant" | "manager" | "admin";
  homeassistant_api: boolean;
  auth_api: boolean;
  full_access: boolean;
  protected: boolean;
  rating: "1-6";
  stdin: boolean;
  webui: null | string;
  gpio: boolean;
  kernel_modules: boolean;
  devicetree: boolean;
  docker_api: boolean;
  audio: boolean;
  audio_input: null | string;
  audio_output: null | string;
  services_role: string[];
  discovery: string[];
  ip_address: string;
  ingress: boolean;
  ingress_panel: boolean;
  ingress_entry: null | string;
  ingress_url: null | string;
}

export interface HassioAddonsInfo {
  addons: HassioAddonInfo[];
  repositories: HassioAddonRepository[];
}

export interface HassioAddonSetSecurityParams {
  protected?: boolean;
}

export interface HassioAddonRepository {
  slug: string;
  name: string;
  source: string;
  url: string;
  maintainer: string;
}

export interface HassioAddonSetOptionParams {
  audio_input?: string | null;
  audio_output?: string | null;
  options?: object | null;
  boot?: "auto" | "manual";
  auto_update?: boolean;
  ingress_panel?: boolean;
  network?: object | null;
}

export const reloadHassioAddons = async (hass: HomeAssistant) => {
  await hass.callApi<HassioResponse<void>>("POST", `hassio/addons/reload`);
};

export const fetchHassioAddonsInfo = async (hass: HomeAssistant) => {
  const result = await hass.callApi<HassioResponse<HassioAddonsInfo>>(
    "GET",
    `hassio/addons`
  );
  return hassioApiResultExtractor(result);
};

export const fetchHassioAddonInfo = async (
  hass: HomeAssistant,
  slug: string
) => {
  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioAddonDetails>>(
      "GET",
      `hassio/addons/${slug}/info`
    )
  );
};

export const fetchHassioAddonChangelog = async (
  hass: HomeAssistant,
  slug: string
) => {
  return await hass.callApi<string>("GET", `hassio/addons/${slug}/changelog`);
};

export const fetchHassioAddonLogs = async (
  hass: HomeAssistant,
  slug: string
) => {
  return await hass.callApi<string>("GET", `hassio/addons/${slug}/logs`);
};

export const setHassioAddonOption = async (
  hass: HomeAssistant,
  slug: string,
  data: HassioAddonSetOptionParams
) => {
  await hass.callApi<HassioResponse<void>>(
    "POST",
    `hassio/addons/${slug}/options`,
    data
  );
};

export const setHassioAddonSecurity = async (
  hass: HomeAssistant,
  slug: string,
  data: HassioAddonSetSecurityParams
) => {
  await hass.callApi<HassioResponse<void>>(
    "POST",
    `hassio/addons/${slug}/security`,
    data
  );
};

export const installHassioAddon = async (hass: HomeAssistant, slug: string) => {
  await hass.callApi<HassioResponse<void>>(
    "POST",
    `hassio/addons/${slug}/install`
  );
};

export const uninstallHassioAddon = async (
  hass: HomeAssistant,
  slug: string
) => {
  await hass.callApi<HassioResponse<void>>(
    "POST",
    `hassio/addons/${slug}/uninstall`
  );
};
