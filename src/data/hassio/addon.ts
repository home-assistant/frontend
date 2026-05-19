import type { HaFormSchema } from "../../components/ha-form/types";
import type {
  CallWS,
  HomeAssistant,
  HomeAssistantApi,
  TranslationDict,
} from "../../types";
import { supervisorApiCall } from "../supervisor/common";
import type { StoreAddonDetails } from "../supervisor/store";
import type { Supervisor, SupervisorArch } from "../supervisor/supervisor";
import type { HassioResponse } from "./common";
import { extractApiErrorMessage } from "./common";

export type AddonCapability = Exclude<
  keyof TranslationDict["ui"]["panel"]["config"]["apps"]["dashboard"]["capability"],
  "label" | "role" | "stages"
>;
export type AddonStage = "stable" | "experimental" | "deprecated";
export type AddonAppArmour = "disable" | "default" | "profile";
export type AddonRole = "default" | "homeassistant" | "manager" | "admin";
export type AddonStartup =
  | "initialize"
  | "system"
  | "services"
  | "application"
  | "once";
export type AddonState =
  | "startup"
  | "started"
  | "stopped"
  | "unknown"
  | "error"
  | null;
export type AddonRepository = "core" | "local" | string;

interface AddonFieldTranslation {
  name?: string;
  description?: string;
  fields?: Record<string, AddonFieldTranslation>;
}

interface AddonTranslations {
  network?: Record<string, string>;
  configuration?: Record<string, AddonFieldTranslation>;
}

export interface HassioAddonInfo {
  advanced: boolean;
  available: boolean;
  build: boolean;
  description: string;
  detached: boolean;
  homeassistant: string;
  icon: boolean;
  installed: boolean;
  logo: boolean;
  name: string;
  repository: AddonRepository;
  slug: string;
  stage: AddonStage;
  state: AddonState;
  update_available: boolean;
  url: string | null;
  version_latest: string;
  version: string;
}

export interface HassioAddonDetails extends HassioAddonInfo {
  apparmor: AddonAppArmour;
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
  hassio_role: AddonRole;
  hostname: string;
  homeassistant_api: boolean;
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
  rating: "1-8";
  schema: HaFormSchema[] | null;
  services_role: string[];
  signed: boolean;
  slug: string;
  startup: AddonStartup;
  stdin: boolean;
  system_managed: boolean;
  system_managed_config_entry: string | null;
  translations: Record<string, AddonTranslations>;
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
  await hass.callWS({
    type: "supervisor/api",
    endpoint: "/addons/reload",
    method: "post",
  });
};

export const fetchHassioAddonsInfo = async (
  hass: HomeAssistant
): Promise<HassioAddonsInfo> => {
  return hass.callWS({
    type: "supervisor/api",
    endpoint: "/addons",
    method: "get",
  });
};

export const fetchHassioAddonInfo = async (
  callWS: CallWS,
  slug: string
): Promise<HassioAddonDetails> => {
  return callWS({
    type: "supervisor/api",
    endpoint: `/addons/${slug}/info`,
    method: "get",
  });
};

export const fetchHassioAddonChangelog = async (
  api: HomeAssistantApi,
  slug: string
) => api.callApi<string>("GET", `hassio/addons/${slug}/changelog`);

export const fetchHassioAddonLogs = async (hass: HomeAssistant, slug: string) =>
  hass.callApi<string>("GET", `hassio/addons/${slug}/logs`);

export const fetchHassioAddonDocumentation = async (
  hass: HomeAssistant,
  slug: string
) => hass.callApi<string>("GET", `hassio/addons/${slug}/documentation`);

export const setHassioAddonOption = async (
  callWS: CallWS,
  slug: string,
  data: HassioAddonSetOptionParams
) => {
  const response = await callWS<HassioResponse<any>>({
    type: "supervisor/api",
    endpoint: `/addons/${slug}/options`,
    method: "post",
    data,
  });

  if (response.result === "error") {
    throw Error(extractApiErrorMessage(response));
  }
  return response;
};

export const validateHassioAddonOption = async (
  callWS: CallWS,
  slug: string,
  data?: any
): Promise<{ message: string; valid: boolean }> => {
  return callWS({
    type: "supervisor/api",
    endpoint: `/addons/${slug}/options/validate`,
    method: "post",
    data,
  });
};

export const startHassioAddon = async (callWS: CallWS, slug: string) => {
  return callWS({
    type: "supervisor/api",
    endpoint: `/addons/${slug}/start`,
    method: "post",
    timeout: null,
  });
};

export const stopHassioAddon = async (callWS: CallWS, slug: string) => {
  return callWS({
    type: "supervisor/api",
    endpoint: `/addons/${slug}/stop`,
    method: "post",
    timeout: null,
  });
};

export const setHassioAddonSecurity = async (
  callWS: CallWS,
  slug: string,
  data: HassioAddonSetSecurityParams
) => {
  await callWS({
    type: "supervisor/api",
    endpoint: `/addons/${slug}/security`,
    method: "post",
    data,
  });
};

export const installHassioAddon = async (
  callWS: CallWS,
  slug: string
): Promise<void> => {
  await callWS({
    type: "supervisor/api",
    endpoint: `/addons/${slug}/install`,
    method: "post",
    timeout: null,
  });
};

export const updateHassioAddon = async (
  hass: HomeAssistant,
  slug: string,
  backup: boolean
): Promise<void> => {
  await hass.callWS({
    type: "hassio/update/addon",
    addon: slug,
    backup: backup,
  });
};

export const restartHassioAddon = async (
  callWS: CallWS,
  slug: string
): Promise<void> => {
  await callWS({
    type: "supervisor/api",
    endpoint: `/addons/${slug}/restart`,
    method: "post",
    timeout: null,
  });
};

export const uninstallHassioAddon = async (
  callWS: CallWS,
  slug: string,
  removeData: boolean
): Promise<void> => {
  await callWS({
    type: "supervisor/api",
    endpoint: `/addons/${slug}/uninstall`,
    method: "post",
    timeout: null,
    data: { remove_config: removeData },
  });
};

export const fetchAddonInfo = (
  hass: HomeAssistant,
  supervisor: Supervisor,
  addonSlug: string
): Promise<HassioAddonDetails | StoreAddonDetails> =>
  supervisorApiCall(
    hass,
    !supervisor.addon?.addons.find((addon) => addon.slug === addonSlug)
      ? `/store/addons/${addonSlug}` // Use /store/addons when app is not installed
      : `/addons/${addonSlug}/info` // Use /addons when app is installed
  );

export const rebuildLocalAddon = async (
  callWS: CallWS,
  slug: string
): Promise<void> => {
  return callWS<undefined>({
    type: "supervisor/api",
    endpoint: `/addons/${slug}/rebuild`,
    method: "post",
    timeout: null,
  });
};
