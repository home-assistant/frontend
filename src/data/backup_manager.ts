import type { HomeAssistant } from "../types";

export type BackupManagerState =
  | "idle"
  | "create_backup"
  | "receive_backup"
  | "restore_backup";

export type CreateBackupStage =
  | "addon_repositories"
  | "addons"
  | "await_addon_restarts"
  | "docker_config"
  | "finishing_file"
  | "folders"
  | "home_assistant"
  | "upload_to_agents";

export type CreateBackupState = "completed" | "failed" | "in_progress";

export type ReceiveBackupStage = "receive_file" | "upload_to_agents";

export type ReceiveBackupState = "completed" | "failed" | "in_progress";

export type RestoreBackupStage =
  | "addon_repositories"
  | "addons"
  | "await_addon_restarts"
  | "await_home_assistant_restart"
  | "check_home_assistant"
  | "docker_config"
  | "download_from_agent"
  | "folders"
  | "home_assistant"
  | "remove_delta_addons";

export type RestoreBackupState = "completed" | "failed" | "in_progress";

interface IdleEvent {
  manager_state: "idle";
}

interface CreateBackupEvent {
  manager_state: "create_backup";
  stage: CreateBackupStage | null;
  state: CreateBackupState;
}

interface ReceiveBackupEvent {
  manager_state: "receive_backup";
  stage: ReceiveBackupStage | null;
  state: ReceiveBackupState;
}

interface RestoreBackupEvent {
  manager_state: "restore_backup";
  stage: RestoreBackupStage | null;
  state: RestoreBackupState;
}

export type ManagerState =
  | "idle"
  | "create_backup"
  | "receive_backup"
  | "restore_backup";

export type ManagerStateEvent =
  | IdleEvent
  | CreateBackupEvent
  | ReceiveBackupEvent
  | RestoreBackupEvent;

export const subscribeBackupEvents = (
  hass: HomeAssistant,
  callback: (event: ManagerStateEvent) => void,
  preCheck?: () => boolean | Promise<boolean>
) =>
  hass.connection.subscribeMessage<ManagerStateEvent>(
    callback,
    {
      type: "backup/subscribe_events",
    },
    { preCheck }
  );

export const DEFAULT_MANAGER_STATE: ManagerStateEvent = {
  manager_state: "idle",
};
