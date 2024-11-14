import type { HomeAssistant } from "../types";

export interface BackupAgent {
  agent_id: string;
}

interface BackupAgentBackup {
  agent_id: string;
  date: string;
  id: string;
  name: string;
  path: string;
  protected: boolean;
  size: number;
  slug: string;
}

export interface BackupContent {
  slug: string;
  date: string;
  name: string;
  size: number;
  agents?: string[];
  path?: string;
}

export interface BackupData {
  backing_up: boolean;
}

export interface BackupAgentsInfo {
  agents: BackupAgent[];
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

export const fetchBackupAgentsBackups = (
  hass: HomeAssistant
): Promise<BackupAgentBackup[]> =>
  hass.callWS({
    type: "backup/agents/list_backups",
  });

export const removeBackup = (
  hass: HomeAssistant,
  slug: string
): Promise<void> =>
  hass.callWS({
    type: "backup/remove",
    slug,
  });

type GenerateBackupParams = {
  agent_ids: string[];
  database_included?: boolean;
  folders_included?: string[];
  addons_included?: string[];
  name?: string;
  password?: string;
};

export const generateBackup = (
  hass: HomeAssistant,
  params: GenerateBackupParams
): Promise<BackupContent> =>
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
