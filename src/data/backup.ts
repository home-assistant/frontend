import { HomeAssistant } from "../types";

interface BackupSyncAgent {
  id: string;
}

interface BaseBackupContent {
  slug: string;
  date: string;
  name: string;
  size: number;
  agents?: string[];
}

export interface BackupContent extends BaseBackupContent {
  path?: string;
}

export interface BackupSyncedContent extends BaseBackupContent {
  id: string;
  agent_id: string;
}

export interface BackupData {
  backing_up: boolean;
  backups: BackupContent[];
}

export interface BackupAgentsInfo {
  agents: BackupSyncAgent[];
  syncing: boolean;
}

export const getBackupDownloadUrl = (slug: string) =>
  `/api/backup/download/${slug}`;

export const fetchBackupInfo = (hass: HomeAssistant): Promise<BackupData> =>
  hass.callWS({
    type: "backup/info",
  });

export const fetchBackupDetails = (
  hass: HomeAssistant,
  slug: string
): Promise<{ backup: BackupContent }> =>
  hass.callWS({
    type: "backup/details",
    slug,
  });

export const fetchBackupAgentsInfo = (
  hass: HomeAssistant
): Promise<BackupAgentsInfo> =>
  hass.callWS({
    type: "backup/agents/info",
  });

export const fetchBackupAgentsSynced = (
  hass: HomeAssistant
): Promise<BackupSyncedContent[]> =>
  hass.callWS({
    type: "backup/agents/synced",
  });

export const removeBackup = (
  hass: HomeAssistant,
  slug: string
): Promise<void> =>
  hass.callWS({
    type: "backup/remove",
    slug,
  });

export const generateBackup = (hass: HomeAssistant): Promise<BackupContent> =>
  hass.callWS({
    type: "backup/generate",
  });

export const uploadBackup = async (
  hass: HomeAssistant,
  file: File
): Promise<void> => {
  const fd = new FormData();
  fd.append("file", file);
  const resp = await hass.fetchWithAuth("/api/backup/upload", {
    method: "POST",
    body: fd,
  });

  if (!resp.ok) {
    throw new Error(`${resp.status} ${resp.statusText}`);
  }
};
