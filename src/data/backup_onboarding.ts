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
