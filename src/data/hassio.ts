import { HomeAssistant } from "../types";

interface HassioResponse<T> {
  data: T;
  result: "ok";
}

interface CreateSessionResponse {
  session: string;
}

export interface HassioAddon {
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
  repository: null | string;
  version: null | string;
  last_version: string;
  state: "none" | "started" | "stopped";
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

const hassioApiResultExtractor = <T>(response: HassioResponse<T>) =>
  response.data;

export const createHassioSession = async (hass: HomeAssistant) => {
  const response = await hass.callApi<HassioResponse<CreateSessionResponse>>(
    "POST",
    "hassio/ingress/session"
  );
  document.cookie = `ingress_session=${
    response.data.session
  };path=/api/hassio_ingress/`;
};

export const fetchHassioAddonInfo = async (
  hass: HomeAssistant,
  addon: string
) =>
  hass
    .callApi<HassioResponse<HassioAddon>>("GET", `hassio/addons/${addon}/info`)
    .then(hassioApiResultExtractor);
