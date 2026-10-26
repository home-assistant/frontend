import type { HomeAssistant } from "../../types";
import type { HostDisk, HostDiskPartition } from "../hassio/host";

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
  ACTIVATING = "activating",
  DEACTIVATING = "deactivating",
  FAILED = "failed",
  INACTIVE = "inactive",
  MAINTENANCE = "maintenance",
  RELOADING = "reloading",
}

interface MountOptions {
  default_backup_mount?: string | null;
}

export type CIFSVersion = "auto" | "1.0" | "2.0";

interface SupervisorMountBase {
  name: string;
  usage: SupervisorMountUsage | null;
  type: SupervisorMountType;
  read_only: boolean;
}

export interface SupervisorMountResponse extends SupervisorMountBase {
  state: SupervisorMountState | null;
  user_path: string | null;
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
  version?: CIFSVersion | null;
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
  version?: CIFSVersion | null;
}

interface SupervisorDiskMountRequestParamsBase {
  name: string;
  usage: SupervisorMountUsage;
  type: SupervisorMountType.DISK;
  read_only?: boolean;
}

// At least one identifier is required. Both may be sent together, as a
// listed partition carries both; Supervisor then resolves by uuid and checks
// the device agrees with it.
export type SupervisorDiskMountRequestParams =
  | (SupervisorDiskMountRequestParamsBase & { device: string; uuid?: string })
  | (SupervisorDiskMountRequestParamsBase & { uuid: string; device?: string });

export type SupervisorMountRequestParams =
  | SupervisorNFSMountRequestParams
  | SupervisorCIFSMountRequestParams
  | SupervisorDiskMountRequestParams;

export interface SupervisorMounts {
  default_backup_mount: string | null;
  mounts: SupervisorMount[];
}

export interface MountableDiskPartition {
  disk: HostDisk;
  partition: HostDiskPartition;
}

// Supervisor may also list partitions it cannot mount.
export const mountableDiskPartitions = (
  disks: HostDisk[]
): MountableDiskPartition[] =>
  disks.flatMap((disk) =>
    disk.partitions
      .filter((partition) => partition.mountable === true)
      .map((partition) => ({ disk, partition }))
  );

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

export const createSupervisorMount = async (
  callWS: HomeAssistant["callWS"],
  data: SupervisorMountRequestParams
): Promise<void> =>
  callWS({
    type: "supervisor/api",
    endpoint: `/mounts`,
    method: "post",
    timeout: null,
    data,
  });

export const updateSupervisorMount = async (
  callWS: HomeAssistant["callWS"],
  data: Partial<SupervisorMountRequestParams>
): Promise<void> =>
  callWS({
    type: "supervisor/api",
    endpoint: `/mounts/${data.name}`,
    method: "put",
    timeout: null,
    data,
  });

export const removeSupervisorMount = async (
  callWS: HomeAssistant["callWS"],
  name: string
): Promise<void> =>
  callWS({
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
