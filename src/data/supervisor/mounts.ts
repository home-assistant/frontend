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

// Supervisor resolves device to uuid; responses report uuid and filesystem.
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

// Create from a candidate with device; round-trip a resolved mount with uuid.
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

// Null when UDisks2 cannot attribute the device to a drive.
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
  type: SupervisorMountType.DISK;
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

// Disk mounts have no server/share/path, so describe them by filesystem and uuid.
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

// Empty list without UDisks2. Older Supervisors return 404; hide the feature.
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
