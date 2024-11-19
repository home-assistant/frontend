import type { HomeAssistant } from "../types";

export interface BackupAgent {
  agent_id: string;
}

export interface BackupContent {
  backup_id: string;
  date: string;
  name: string;
  protected: boolean;
  size: number;
  agent_ids?: string[];
}

export interface BackupInfo {
  backups: BackupContent[];
  backing_up: boolean;
}

export interface BackupDetails {
  backup: BackupContent;
}

export interface BackupAgentsInfo {
  agents: BackupAgent[];
}

export type GenerateBackupParams = {
  agent_ids: string[];
  database_included?: boolean;
  folders_included?: string[];
  addons_included?: string[];
  name?: string;
  password?: string;
};

export const getBackupDownloadUrl = (id: string) =>
  `/api/backup/download/${id}`;

export const fetchBackupInfo = (hass: HomeAssistant): Promise<BackupInfo> =>
  hass.callWS({
    type: "backup/info",
  });

export const fetchBackupDetails = (
  hass: HomeAssistant,
  id: string
): Promise<BackupDetails> =>
  hass.callWS({
    type: "backup/details",
    backup_id: id,
  });

export const fetchBackupAgentsInfo = (
  hass: HomeAssistant
): Promise<BackupAgentsInfo> =>
  hass.callWS({
    type: "backup/agents/info",
  });

export const removeBackup = (hass: HomeAssistant, id: string): Promise<void> =>
  hass.callWS({
    type: "backup/remove",
    backup_id: id,
  });

export const generateBackup = (
  hass: HomeAssistant,
  params: GenerateBackupParams
): Promise<{ backup_id: string }> =>
  hass.callWS({
    type: "backup/generate",
    ...params,
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
