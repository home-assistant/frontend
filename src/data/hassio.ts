import { HomeAssistant, PanelInfo } from "../types";

export type HassioPanelInfo = PanelInfo<
  | undefined
  | {
      ingress?: string;
    }
>;

interface HassioResponse<T> {
  data: T;
  result: "ok";
}

interface CreateSessionResponse {
  session: string;
}

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
  ingress_entry: null | string;
  ingress_url: null | string;
}

export interface HassioAddonRepository {
  slug: string;
  name: string;
  source: string;
  url: string;
  maintainer: string;
}

export interface HassioAddonsInfo {
  addons: HassioAddonInfo[];
  repositories: HassioAddonRepository[];
}
export interface HassioHassOSInfo {
  version: string;
  version_cli: string;
  version_latest: string;
  version_cli_latest: string;
  board: "ova" | "rpi";
}
export type HassioHomeAssistantInfo = any;
export type HassioSupervisorInfo = any;
export type HassioHostInfo = any;

export interface HassioSnapshot {
  slug: string;
  date: string;
  name: string;
  type: "full" | "partial";
  protected: boolean;
}

export interface HassioSnapshotDetail extends HassioSnapshot {
  size: string;
  homeassistant: string;
  addons: Array<{
    slug: "ADDON_SLUG";
    name: "NAME";
    version: "INSTALLED_VERSION";
    size: "SIZE_IN_MB";
  }>;
  repositories: string[];
  folders: string[];
}

export interface HassioFullSnapshotCreateParams {
  name: string;
  password?: string;
}
export interface HassioPartialSnapshotCreateParams {
  name: string;
  folders: string[];
  addons: string[];
  password?: string;
}

const hassioApiResultExtractor = <T>(response: HassioResponse<T>) =>
  response.data;

export const createHassioSession = async (hass: HomeAssistant) => {
  const response = await hass.callApi<HassioResponse<CreateSessionResponse>>(
    "POST",
    "hassio/ingress/session"
  );
  document.cookie = `ingress_session=${response.data.session};path=/api/hassio_ingress/`;
};

export const reloadHassioAddons = (hass: HomeAssistant) =>
  hass.callApi<unknown>("POST", `hassio/addons/reload`);

export const fetchHassioAddonsInfo = (hass: HomeAssistant) =>
  hass
    .callApi<HassioResponse<HassioAddonsInfo>>("GET", `hassio/addons`)
    .then(hassioApiResultExtractor);

export const fetchHassioAddonInfo = (hass: HomeAssistant, addon: string) =>
  hass
    .callApi<HassioResponse<HassioAddonDetails>>(
      "GET",
      `hassio/addons/${addon}/info`
    )
    .then(hassioApiResultExtractor);

export const fetchHassioSupervisorInfo = (hass: HomeAssistant) =>
  hass
    .callApi<HassioResponse<HassioSupervisorInfo>>(
      "GET",
      "hassio/supervisor/info"
    )
    .then(hassioApiResultExtractor);

export const fetchHassioHostInfo = (hass: HomeAssistant) =>
  hass
    .callApi<HassioResponse<HassioHostInfo>>("GET", "hassio/host/info")
    .then(hassioApiResultExtractor);

export const fetchHassioHassOsInfo = (hass: HomeAssistant) =>
  hass
    .callApi<HassioResponse<HassioHassOSInfo>>("GET", "hassio/hassos/info")
    .then(hassioApiResultExtractor);

export const fetchHassioHomeAssistantInfo = (hass: HomeAssistant) =>
  hass
    .callApi<HassioResponse<HassioHomeAssistantInfo>>(
      "GET",
      "hassio/homeassistant/info"
    )
    .then(hassioApiResultExtractor);

export const fetchHassioSnapshots = (hass: HomeAssistant) =>
  hass
    .callApi<HassioResponse<{ snapshots: HassioSnapshot[] }>>(
      "GET",
      "hassio/snapshots"
    )
    .then((resp) => resp.data.snapshots);

export const reloadHassioSnapshots = (hass: HomeAssistant) =>
  hass.callApi<unknown>("POST", `hassio/snapshots/reload`);

export const createHassioFullSnapshot = (
  hass: HomeAssistant,
  data: HassioFullSnapshotCreateParams
) => hass.callApi<unknown>("POST", "hassio/snapshots/new/full", data);

export const createHassioPartialSnapshot = (
  hass: HomeAssistant,
  data: HassioPartialSnapshotCreateParams
) => hass.callApi<unknown>("POST", "hassio/snapshots/new/partial", data);

export const fetchHassioSnapshotInfo = (
  hass: HomeAssistant,
  snapshot: string
) =>
  hass
    .callApi<HassioResponse<HassioSnapshotDetail>>(
      "GET",
      `hassio/snapshots/${snapshot}/info`
    )
    .then(hassioApiResultExtractor);
