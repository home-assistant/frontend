import { handleFetchPromise } from "../util/hass-call-api";
import type { BackupContentExtended } from "./backup";
import type {
  BackupManagerState,
  RestoreBackupStage,
  RestoreBackupState,
} from "./backup_manager";

export interface BackupOnboardingConfig {
  backups: BackupContentExtended[];
  state: BackupManagerState;
  last_non_idle_event?: {
    manager_state: BackupManagerState;
    stage: RestoreBackupStage | null;
    state: RestoreBackupState;
  } | null;
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
