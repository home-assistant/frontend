import type { HomeAssistant } from "../types";

export const enum BackupScheduleState {
  NEVER = "never",
  DAILY = "daily",
  MONDAY = "mon",
  TUESDAY = "tue",
  WEDNESDAY = "wed",
  THURSDAY = "thu",
  FRIDAY = "fri",
  SATURDAY = "sat",
  SUNDAY = "sun",
}

export interface BackupConfig {
  create_backup: {
    agent_ids: string[];
    include_addons: string[] | null;
    include_all_addons: boolean;
    include_database: boolean;
    include_folders: string[] | null;
    name: string | null;
    password: string | null;
  };
  retention: {
    copies?: number | null;
    days?: number | null;
  };
  last_automatic_backup: string | null;
  schedule: {
    state: BackupScheduleState;
  };
}

export interface BackupMutableConfig {
  create_backup?: {
    agent_ids?: string[];
    include_addons?: string[];
    include_all_addons?: boolean;
    include_database?: boolean;
    include_folders?: string[];
    name?: string | null;
    password?: string | null;
  };
  retention?: {
    copies?: number | null;
    days?: number | null;
  };
  schedule?: BackupScheduleState;
}

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

export interface BackupData {
  addons: BackupAddon[];
  database_included: boolean;
  folders: string[];
  homeassistant_version: string;
  homeassistant_included: boolean;
}

export interface BackupAddon {
  name: string;
  slug: string;
  version: string;
}

export interface BackupContentExtended extends BackupContent, BackupData {}

export interface BackupInfo {
  backups: BackupContent[];
  backing_up: boolean;
}

export interface BackupDetails {
  backup: BackupContentExtended;
}

export interface BackupAgentsInfo {
  agents: BackupAgent[];
}

export type GenerateBackupParams = {
  agent_ids: string[];
  include_addons?: string[];
  include_all_addons?: boolean;
  include_database?: boolean;
  include_folders?: string[];
  include_homeassistant?: boolean;
  name?: string;
  password?: string;
};

export type RestoreBackupParams = {
  backup_id: string;
  agent_id: string;
  password?: string;
  restore_addons?: string[];
  restore_database?: boolean;
  restore_folders?: string[];
  restore_homeassistant?: boolean;
};

export const fetchBackupConfig = (hass: HomeAssistant) =>
  hass.callWS<{ config: BackupConfig }>({ type: "backup/config/info" });

export const updateBackupConfig = (
  hass: HomeAssistant,
  config: BackupMutableConfig
) => hass.callWS({ type: "backup/config/update", ...config });

export const getBackupDownloadUrl = (id: string, agentId: string) =>
  `/api/backup/download/${id}?agent_id=${agentId}`;

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

export const deleteBackup = (hass: HomeAssistant, id: string): Promise<void> =>
  hass.callWS({
    type: "backup/delete",
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

export const restoreBackup = (
  hass: HomeAssistant,
  params: RestoreBackupParams
): Promise<{ backup_id: string }> =>
  hass.callWS({
    type: "backup/restore",
    ...params,
  });

export const uploadBackup = async (
  hass: HomeAssistant,
  file: File,
  agent_ids: string[]
): Promise<void> => {
  const fd = new FormData();
  fd.append("file", file);

  const params = agent_ids.reduce((acc, agent_id) => {
    acc.append("agent_id", agent_id);
    return acc;
  }, new URLSearchParams());

  const resp = await hass.fetchWithAuth(
    `/api/backup/upload?${params.toString()}`,
    {
      method: "POST",
      body: fd,
    }
  );

  if (!resp.ok) {
    throw new Error(`${resp.status} ${resp.statusText}`);
  }
};

type BackupEvent = BackupProgressEvent;

type BackupProgressEvent = {
  event_type: "backup_progress";
  done: boolean;
  stage: string;
  success?: boolean;
};

export const subscribeBackupEvents = (
  hass: HomeAssistant,
  callback: (event: BackupEvent) => void
) =>
  hass.connection.subscribeMessage<BackupEvent>(callback, {
    type: "backup/subscribe_events",
  });

export const getPreferredAgentForDownload = (agents: string[]) => {
  const localAgents = agents.filter(
    (agent) => agent.split(".")[0] === "backup"
  );
  return localAgents[0] || agents[0];
};
