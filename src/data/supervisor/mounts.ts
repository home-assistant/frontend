import type { HomeAssistant } from "../../types";

export enum SupervisorMountType {
  BIND = "bind",
  CIFS = "cifs",
  DISK = "disk",
  NFS = "nfs",
}

export enum SupervisorMountUsage {
  BACKUP = "backup",
  MEDIA = "media",
  SHARE = "share",
}

export enum SupervisorMountState {
  ACTIVE = "active",
  FAILED = "failed",
  UNKNOWN = "unknown",
}

interface MountOptions {
  default_backup_mount?: string | null;
}

export type CIFSVersion = "auto" | "1.0" | "2.0";

interface SupervisorMountBase {
  name: string;
  usage: SupervisorMountUsage;
  type: SupervisorMountType;
  read_only?: boolean;
}

export interface SupervisorMountResponse extends SupervisorMountBase {
  state: SupervisorMountState | null;
}

// Supervisor omits port when the mount uses the protocol default.
interface SupervisorNetworkMount extends SupervisorMountResponse {
  server: string;
  port?: number;
}

export interface SupervisorNFSMount extends SupervisorNetworkMount {
  type: SupervisorMountType.NFS;
  path: string;
}

export interface SupervisorCIFSMount extends SupervisorNetworkMount {
  type: SupervisorMountType.CIFS;
  share: string;
  version?: CIFSVersion;
}

// A disk mount is identified by device on the way in, but Supervisor resolves
// that to a UUID and only ever reports uuid and filesystem back.
export interface SupervisorDiskMount extends SupervisorMountResponse {
  type: SupervisorMountType.DISK;
  uuid: string;
  filesystem?: string;
}

export type SupervisorMount =
  SupervisorNFSMount | SupervisorCIFSMount | SupervisorDiskMount;

export type SupervisorNFSMountRequestParams = SupervisorNFSMount;

export interface SupervisorCIFSMountRequestParams extends SupervisorCIFSMount {
  username?: string;
  password?: string;
  version?: CIFSVersion;
}

interface SupervisorDiskMountRequestParamsBase {
  name: string;
  usage: SupervisorMountUsage;
  type: SupervisorMountType.DISK;
  read_only?: boolean;
}

// Supervisor accepts exactly one identifier: device when creating from a
// candidate, uuid when round-tripping a mount it already resolved.
export type SupervisorDiskMountRequestParams =
  | (SupervisorDiskMountRequestParamsBase & { device: string; uuid?: never })
  | (SupervisorDiskMountRequestParamsBase & { uuid: string; device?: never });

export type SupervisorMountRequestParams =
  | SupervisorNFSMountRequestParams
  | SupervisorCIFSMountRequestParams
  | SupervisorDiskMountRequestParams;

export interface SupervisorMounts {
  default_backup_mount: string | null;
  mounts: SupervisorMount[];
}

// Null when UDisks2 cannot attribute the device to a drive, which also happens
// when the drive is unplugged between enumeration and lookup.
export interface SupervisorMountCandidateDrive {
  vendor: string;
  model: string;
  serial: string;
  id: string;
  size: number;
  connection_bus: string;
  removable: boolean;
  ejectable: boolean;
}

export interface SupervisorMountCandidate {
  device: string;
  uuid: string;
  label: string;
  filesystem: string;
  size: number;
  read_only: boolean;
  drive: SupervisorMountCandidateDrive | null;
}

export interface SupervisorMountCandidates {
  candidates: SupervisorMountCandidate[];
}

// Identifies a mount in a list row. A disk mount has no server, share or path,
// so it is described by what Supervisor does report for it.
export const supervisorMountDescription = (mount: SupervisorMount): string => {
  if (mount.type === SupervisorMountType.DISK) {
    return [mount.filesystem, mount.uuid].filter(Boolean).join(" • ");
  }
  return `${mount.server}${mount.port ? `:${mount.port}` : ""}${
    mount.type === SupervisorMountType.NFS ? mount.path : `:${mount.share}`
  }`;
};

export const fetchSupervisorMounts = async (
  hass: HomeAssistant
): Promise<SupervisorMounts> =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: `/mounts`,
    method: "get",
    timeout: null,
  });

// Returns an empty list on a host without UDisks2. A Supervisor predating disk
// mounts answers 404, which callers use to hide the feature.
export const fetchSupervisorMountCandidates = async (
  hass: HomeAssistant
): Promise<SupervisorMountCandidates> =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: `/mounts/candidates`,
    method: "get",
    timeout: null,
  });

export const createSupervisorMount = async (
  hass: HomeAssistant,
  data: SupervisorMountRequestParams
): Promise<void> =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: `/mounts`,
    method: "post",
    timeout: null,
    data,
  });

export const updateSupervisorMount = async (
  hass: HomeAssistant,
  data: Partial<SupervisorMountRequestParams>
): Promise<void> =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: `/mounts/${data.name}`,
    method: "put",
    timeout: null,
    data,
  });

export const removeSupervisorMount = async (
  hass: HomeAssistant,
  name: string
): Promise<void> =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: `/mounts/${name}`,
    method: "delete",
    timeout: null,
  });

export const reloadSupervisorMount = async (
  hass: HomeAssistant,
  data: SupervisorMount
): Promise<void> =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: `/mounts/${data.name}/reload`,
    method: "post",
    timeout: null,
  });

export const changeMountOptions = async (
  hass: HomeAssistant,
  data: MountOptions
): Promise<void> =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: `/mounts/options`,
    method: "post",
    timeout: null,
    data,
  });
