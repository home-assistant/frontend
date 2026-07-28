import type { HomeAssistant } from "../../types";

export interface HassioHostInfo {
  agent_version: string | null;
  apparmor_version: string | null;
  boot_timestamp: number | null;
  broadcast_llmnr: boolean | null;
  broadcast_mdns: boolean | null;
  chassis: string | null;
  cpe: string | null;
  deployment: string | null;
  disk_life_time: number | null;
  disk_free: number;
  disk_total: number;
  disk_used: number;
  dt_synchronized: boolean | null;
  dt_utc: string;
  features: string[];
  hostname: string | null;
  kernel: string | null;
  llmnr_hostname: string | null;
  operating_system: string | null;
  startup_time: number | null;
  timezone: string | null;
  use_ntp: boolean | null;
  virtualization: string | null;
}

export interface HassioHassOSBootSlot {
  state: string | null;
  status: string | null;
  version: string | null;
}

export interface HassioHassOSInfo {
  board: string | null;
  boot: string | null;
  boot_slots: Record<string, HassioHassOSBootSlot>;
  update_available: boolean;
  version_latest: string | null;
  version_pending: string | null;
  version: string | null;
  data_disk: string | null;
}

export interface Datadisk {
  name: string;
  vendor: string;
  model: string;
  serial: string;
  size: number;
  id: string;
  dev_path: string;
}

export interface DatadiskList {
  devices: string[];
  disks: Datadisk[];
}

export interface HostDisksUsage {
  total_bytes?: number;
  used_bytes: number;
  id: string;
  label: string;
  children?: HostDisksUsage[];
}

export const fetchHassioHostInfo = async (
  hass: HomeAssistant
): Promise<HassioHostInfo> =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: "/host/info",
    method: "get",
  });

export const fetchHassioHassOsInfo = async (
  hass: HomeAssistant
): Promise<HassioHassOSInfo> =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: "/os/info",
    method: "get",
  });

export const rebootHost = async (hass: HomeAssistant) =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: "/host/reboot",
    method: "post",
    timeout: null,
  });

export const shutdownHost = async (hass: HomeAssistant) =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: "/host/shutdown",
    method: "post",
    timeout: null,
  });

export const updateOS = async (hass: HomeAssistant) =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: "/os/update",
    method: "post",
    timeout: null,
  });

export const configSyncOS = async (hass: HomeAssistant) =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: "/os/config/sync",
    method: "post",
    timeout: null,
  });

export const changeHostOptions = async (hass: HomeAssistant, options: any) =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: "/host/options",
    method: "post",
    data: options,
  });

export const moveDatadisk = async (hass: HomeAssistant, device: string) =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: "/os/datadisk/move",
    method: "post",
    timeout: null,
    data: { device },
  });

export const listDatadisks = async (
  hass: HomeAssistant
): Promise<DatadiskList> =>
  hass.callWS<DatadiskList>({
    type: "supervisor/api",
    endpoint: "/os/datadisk/list",
    method: "get",
    timeout: null,
  });

export const fetchHostDisksUsage = async (hass: HomeAssistant) =>
  hass.callWS<HostDisksUsage>({
    type: "supervisor/api",
    endpoint: "/host/disks/default/usage",
    method: "get",
    timeout: 3600, // seconds. This can take a while
    params: { max_depth: 3 },
  });
