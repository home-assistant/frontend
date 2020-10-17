import { HomeAssistant } from "../../types";
import { hassioApiResultExtractor, HassioResponse } from "./common";

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
  advanced: boolean;
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
  documentation: boolean;
  available: boolean;
  arch: "armhf" | "aarch64" | "i386" | "amd64";
  machine: any;
  homeassistant: string;
  version_latest: string;
  boot: "auto" | "manual";
  build: boolean;
  options: Record<string, unknown>;
  network: null | Record<string, number>;
  network_description: null | Record<string, string>;
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
  stage: "stable" | "experimental" | "deprecated";
  changelog: boolean;
  hassio_api: boolean;
  hassio_role: "default" | "homeassistant" | "manager" | "admin";
  startup: "initialize" | "system" | "services" | "application" | "once";
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
  watchdog: null | boolean;
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
  options?: Record<string, unknown> | null;
  boot?: "auto" | "manual";
  auto_update?: boolean;
  ingress_panel?: boolean;
  network?: Record<string, unknown> | null;
  watchdog?: boolean;
}

export const reloadHassioAddons = async (hass: HomeAssistant) => {
  await hass.callApi<HassioResponse<void>>("POST", `hassio/addons/reload`);
};

export const fetchHassioAddonsInfo = async (hass: HomeAssistant) => {
  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioAddonsInfo>>("GET", `hassio/addons`)
  );
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
  return hass.callApi<string>("GET", `hassio/addons/${slug}/changelog`);
};

export const fetchHassioAddonLogs = async (
  hass: HomeAssistant,
  slug: string
) => {
  return hass.callApi<string>("GET", `hassio/addons/${slug}/logs`);
};

export const fetchHassioAddonDocumentation = async (
  hass: HomeAssistant,
  slug: string
) => {
  return hass.callApi<string>("GET", `hassio/addons/${slug}/documentation`);
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

export const validateHassioAddonOption = async (
  hass: HomeAssistant,
  slug: string
) => {
  return await hass.callApi<
    HassioResponse<{ message: string; valid: boolean }>
  >("POST", `hassio/addons/${slug}/options/validate`);
};

export const startHassioAddon = async (hass: HomeAssistant, slug: string) => {
  return hass.callApi<string>("POST", `hassio/addons/${slug}/start`);
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
  return hass.callApi<HassioResponse<void>>(
    "POST",
    `hassio/addons/${slug}/install`
  );
};

export const restartHassioAddon = async (hass: HomeAssistant, slug: string) => {
  return hass.callApi<HassioResponse<void>>(
    "POST",
    `hassio/addons/${slug}/restart`
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
