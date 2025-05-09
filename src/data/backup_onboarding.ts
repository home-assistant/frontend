import { handleFetchPromise } from "../util/hass-call-api";
import type { BackupContentExtended } from "./backup";
import type {
  BackupManagerState,
  RestoreBackupStage,
  RestoreBackupState,
} from "./backup_manager";

export interface BackupOnboardingInfo {
  state: BackupManagerState;
  last_action_event?: {
    manager_state: BackupManagerState;
    stage: RestoreBackupStage | null;
    state: RestoreBackupState;
    reason: string | null;
  } | null;
}

export interface BackupOnboardingConfig extends BackupOnboardingInfo {
  backups: BackupContentExtended[];
}

export const fetchBackupOnboardingInfo = async () =>
  handleFetchPromise<BackupOnboardingConfig>(
    fetch(`${__HASS_URL__}/api/onboarding/backup/info`)
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
    fetch(`${__HASS_URL__}/api/onboarding/backup/restore`, {
      method: "POST",
      body: JSON.stringify(params),
    })
  );

export const uploadOnboardingBackup = async (
  file: File,
  agentIds: string[]
): Promise<{ backup_id: string }> => {
  const fd = new FormData();
  fd.append("file", file);

  const params = new URLSearchParams();

  agentIds.forEach((agentId) => {
    params.append("agent_id", agentId);
  });

  return handleFetchPromise(
    fetch(`${__HASS_URL__}/api/onboarding/backup/upload?${params.toString()}`, {
      method: "POST",
      body: fd,
    })
  );
};
