import type { HomeAssistant } from "../types";

export enum BackupManagerState {
  IDLE = "idle",
  CREATE_BACKUP = "create_backup",
  RECEIVE_BACKUP = "receive_backup",
  RESTORE_BACKUP = "restore_backup",
}

export enum CreateBackupStage {
  ADDON_REPOSITORIES = "addon_repositories",
  ADDONS = "addons",
  AWAIT_ADDON_RESTARTS = "await_addon_restarts",
  DOCKER_CONFIG = "docker_config",
  FINISHING_FILE = "finishing_file",
  FOLDERS = "folders",
  HOME_ASSISTANT = "home_assistant",
  UPLOAD_TO_AGENTS = "upload_to_agents",
}

export enum CreateBackupState {
  COMPLETED = "completed",
  FAILED = "failed",
  IN_PROGRESS = "in_progress",
}

export enum ReceiveBackupStage {
  RECEIVE_FILE = "receive_file",
  UPLOAD_TO_AGENTS = "upload_to_agents",
}

export enum ReceiveBackupState {
  COMPLETED = "completed",
  FAILED = "failed",
  IN_PROGRESS = "in_progress",
}

export enum RestoreBackupStage {
  ADDON_REPOSITORIES = "addon_repositories",
  ADDONS = "addons",
  AWAIT_ADDON_RESTARTS = "await_addon_restarts",
  AWAIT_HOME_ASSISTANT_RESTART = "await_home_assistant_restart",
  CHECK_HOME_ASSISTANT = "check_home_assistant",
  DOCKER_CONFIG = "docker_config",
  DOWNLOAD_FROM_AGENT = "download_from_agent",
  FOLDERS = "folders",
  HOME_ASSISTANT = "home_assistant",
  REMOVE_DELTA_ADDONS = "remove_delta_addons",
}

export enum RestoreBackupState {
  COMPLETED = "completed",
  FAILED = "failed",
  IN_PROGRESS = "in_progress",
}

type IdleEvent = {
  manager_state: BackupManagerState.IDLE;
};

type CreateBackupEvent = {
  manager_state: BackupManagerState.CREATE_BACKUP;
  stage: CreateBackupStage | null;
  state: CreateBackupState;
};

type ReceiveBackupEvent = {
  manager_state: BackupManagerState.RECEIVE_BACKUP;
  stage: ReceiveBackupStage | null;
  state: ReceiveBackupState;
};

type RestoreBackupEvent = {
  manager_state: BackupManagerState.RESTORE_BACKUP;
  stage: RestoreBackupStage | null;
  state: RestoreBackupState;
};

export type ManagerStateEvent =
  | IdleEvent
  | CreateBackupEvent
  | ReceiveBackupEvent
  | RestoreBackupEvent;

export const subscribeBackupEvents = (
  hass: HomeAssistant,
  callback: (event: ManagerStateEvent) => void
) =>
  hass.connection.subscribeMessage<ManagerStateEvent>(callback, {
    type: "backup/subscribe_events",
  });

export const isBackupInProgress = (state: ManagerStateEvent) =>
  (state.manager_state === BackupManagerState.CREATE_BACKUP &&
    state.state === CreateBackupState.IN_PROGRESS) ||
  (state.manager_state === BackupManagerState.RECEIVE_BACKUP &&
    state.state === ReceiveBackupState.IN_PROGRESS) ||
  (state.manager_state === BackupManagerState.RESTORE_BACKUP &&
    state.state === RestoreBackupState.IN_PROGRESS);
