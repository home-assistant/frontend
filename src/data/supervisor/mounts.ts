import type { HomeAssistant } from "../../types";

export enum SupervisorMountType {
  BIND = "bind",
  CIFS = "cifs",
  NFS = "nfs",
}

export enum SupervisorMountUsage {
  BACKUP = "backup",
  MEDIA = "media",
  SHARE = "share",
}

/** Mirrors the systemd unit active state the Supervisor reports. */
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

/** `auto` is a UI-only value, it is stripped before the mount is submitted. */
export type CIFSVersion = "auto" | "1.0" | "2.0";

interface SupervisorMountBase {
  name: string;
  usage: SupervisorMountUsage;
  type: SupervisorMountType;
  read_only?: boolean;
  server: string;
  port?: number;
}

interface SupervisorNFSMountBase extends SupervisorMountBase {
  type: SupervisorMountType.NFS;
  path: string;
}

interface SupervisorCIFSMountBase extends SupervisorMountBase {
  type: SupervisorMountType.CIFS;
  share: string;
  version?: CIFSVersion | null;
}

/** Fields the Supervisor adds to a configured mount when reporting it. */
export interface SupervisorMountResponse {
  read_only: boolean;
  state: SupervisorMountState | null;
  user_path: string | null;
}

export type SupervisorNFSMount = SupervisorNFSMountBase &
  SupervisorMountResponse;

export type SupervisorCIFSMount = SupervisorCIFSMountBase &
  SupervisorMountResponse;

export type SupervisorMount = SupervisorNFSMount | SupervisorCIFSMount;

export type SupervisorNFSMountRequestParams = SupervisorNFSMountBase;

export interface SupervisorCIFSMountRequestParams extends SupervisorCIFSMountBase {
  username?: string;
  password?: string;
}

export type SupervisorMountRequestParams =
  SupervisorNFSMountRequestParams | SupervisorCIFSMountRequestParams;

export interface SupervisorMounts {
  default_backup_mount: string | null;
  mounts: SupervisorMount[];
}

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
