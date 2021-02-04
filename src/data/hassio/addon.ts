import { HaFormSchema } from "../../components/ha-form/ha-form";
import { HomeAssistant } from "../../types";
import { SupervisorArch } from "../supervisor/supervisor";
import { hassioApiResultExtractor, HassioResponse } from "./common";

export interface HassioAddonInfo {
  advanced: boolean;
  available: boolean;
  build: boolean;
  description: string;
  detached: boolean;
  icon: boolean;
  installed: boolean;
  logo: boolean;
  name: string;
  repository: "core" | "local" | string;
  slug: string;
  stage: "stable" | "experimental" | "deprecated";
  state: "started" | "stopped" | null;
  update_available: boolean;
  url: string | null;
  version_latest: string;
  version: string;
}

export interface HassioAddonDetails extends HassioAddonInfo {
  apparmor: "disable" | "default" | "profile";
  arch: SupervisorArch[];
  audio_input: null | string;
  audio_output: null | string;
  audio: boolean;
  auth_api: boolean;
  auto_uart: boolean;
  auto_update: boolean;
  boot: "auto" | "manual";
  changelog: boolean;
  devices: string[];
  devicetree: boolean;
  discovery: string[];
  docker_api: boolean;
  documentation: boolean;
  full_access: boolean;
  gpio: boolean;
  hassio_api: boolean;
  hassio_role: "default" | "homeassistant" | "manager" | "admin";
  hostname: string;
  homeassistant_api: boolean;
  homeassistant: string;
  host_dbus: boolean;
  host_ipc: boolean;
  host_network: boolean;
  host_pid: boolean;
  ingress_entry: null | string;
  ingress_panel: boolean;
  ingress_url: null | string;
  ingress: boolean;
  ip_address: string;
  kernel_modules: boolean;
  long_description: null | string;
  machine: any;
  network_description: null | Record<string, string>;
  network: null | Record<string, number>;
  options: Record<string, unknown>;
  privileged: any;
  protected: boolean;
  rating: "1-6";
  schema: HaFormSchema[] | null;
  services_role: string[];
  slug: string;
  startup: "initialize" | "system" | "services" | "application" | "once";
  stdin: boolean;
  watchdog: null | boolean;
  webui: null | string;
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
