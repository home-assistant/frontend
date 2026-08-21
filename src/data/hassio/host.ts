import type { HomeAssistant } from "../../types";

export interface HassioHostInfo {
  agent_version: string;
  chassis: string;
  cpe: string;
  deployment: string;
  disk_life_time: number | null;
  disk_free: number;
  disk_total: number;
  disk_used: number;
  features: string[];
  hostname: string;
  kernel: string;
  operating_system: string;
  boot_timestamp: number;
  startup_time: number;
}

export interface HassioHassOSInfo {
  board: string | null;
  boot: string | null;
  update_available: boolean;
  version_latest: string | null;
  version: string | null;
  data_disk: string;
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

// `disk` is "default" for the data disk, or a mount name. Omitting maxDepth
// leaves the depth to the Supervisor, which defaults per target — walking a
// mount costs a round trip per directory, so mounts want no depth at all.
export const fetchHostDisksUsage = async (
  hass: HomeAssistant,
  disk = "default",
  maxDepth?: number
) =>
  hass.callWS<HostDisksUsage>({
    type: "supervisor/api",
    endpoint: `/host/disks/${disk}/usage`,
    method: "get",
    timeout: 3600, // seconds. This can take a while
    ...(maxDepth === undefined ? {} : { params: { max_depth: maxDepth } }),
  });
