import type { LocalizeFunc } from "../common/translations/localize";
import type { HomeAssistant } from "../types";
import { domainToName } from "./integration";

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

export const generateBackupWithStoredSettings = (
  hass: HomeAssistant
): Promise<void> =>
  hass.callWS({
    type: "backup/generate_with_stored_settings",
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

export const getPreferredAgentForDownload = (agents: string[]) => {
  const localAgents = agents.filter(
    (agent) => agent.split(".")[0] === "backup"
  );
  return localAgents[0] || agents[0];
};

export const isLocalAgent = (agentId: string) =>
  ["backup.local", "hassio.local"].includes(agentId);

export const computeBackupAgentName = (
  localize: LocalizeFunc,
  agentId: string,
  agentIds?: string[]
) => {
  if (isLocalAgent(agentId)) {
    return "This system";
  }
  const [domain, name] = agentId.split(".");
  const domainName = domainToName(localize, domain);

  // If there are multiple agents for a domain, show the name
  const showName = agentIds
    ? agentIds.filter((a) => a.split(".")[0] === domain).length > 1
    : true;

  return showName ? `${domainName}: ${name}` : domainName;
};

export const generateEncryptionKey = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const pattern = "xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx";
  let result = "";
  const randomArray = new Uint8Array(pattern.length);
  crypto.getRandomValues(randomArray);
  randomArray.forEach((number, index) => {
    result += pattern[index] === "-" ? "-" : chars[number % chars.length];
  });
  return result;
};
