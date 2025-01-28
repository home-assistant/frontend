import { handleFetchPromise } from "../util/hass-call-api";
import type { BackupContentExtended } from "./backup";
import type {
  BackupManagerState,
  RestoreBackupStage,
  RestoreBackupState,
} from "./backup_manager";

type RestoreFailedReason =
  | "backup_agent_error"
  | "backup_reader_writer_error"
  | "password_incorrect"
  | "decrypt_on_download_not_supported"
  | "backup_manager_error"
  | "unknown"
  | "unknown_error";

export interface BackupOnboardingInfo {
  state: BackupManagerState;
  last_non_idle_event?: {
    manager_state: BackupManagerState;
    stage: RestoreBackupStage | null;
    state: RestoreBackupState;
    reason: RestoreFailedReason | null;
  } | null;
}

export interface BackupOnboardingConfig extends BackupOnboardingInfo {
  backups: BackupContentExtended[];
}

export const fetchBackupOnboardingInfo = async () =>
  handleFetchPromise<BackupOnboardingConfig>(
    fetch("/api/onboarding/backup/info")
  );

export interface RestoreOnboardingBackupParams {
  backup_id: string;
  agent_id: string;
  password?: string;
  restore_addons?: string[];
  restore_database?: boolean;
  restore_folders?: string[];
}

export const restoreOnboardingBackup = async (
  params: RestoreOnboardingBackupParams
) =>
  handleFetchPromise(
    fetch("/api/onboarding/backup/restore", {
      method: "POST",
      body: JSON.stringify(params),
    })
  );
