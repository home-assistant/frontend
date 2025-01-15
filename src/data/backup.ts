import { setHours, setMinutes } from "date-fns";
import type { HassConfig } from "home-assistant-js-websocket";
import memoizeOne from "memoize-one";
import {
  formatDateTime,
  formatDateTimeNumeric,
} from "../common/datetime/format_date_time";
import { formatTime } from "../common/datetime/format_time";
import type { LocalizeFunc } from "../common/translations/localize";
import type { HomeAssistant } from "../types";
import { fileDownload } from "../util/file_download";
import { domainToName } from "./integration";
import type { FrontendLocaleData } from "./translation";

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
  last_attempted_automatic_backup: string | null;
  last_completed_automatic_backup: string | null;
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
  failed_agent_ids?: string[];
  with_automatic_settings: boolean;
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

export interface GenerateBackupParams {
  agent_ids: string[];
  include_addons?: string[];
  include_all_addons?: boolean;
  include_database?: boolean;
  include_folders?: string[];
  include_homeassistant?: boolean;
  name?: string;
  password?: string;
}

export interface RestoreBackupParams {
  backup_id: string;
  agent_id: string;
  password?: string;
  restore_addons?: string[];
  restore_database?: boolean;
  restore_folders?: string[];
  restore_homeassistant?: boolean;
}

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

export const generateBackupWithAutomaticSettings = (
  hass: HomeAssistant
): Promise<void> =>
  hass.callWS({
    type: "backup/generate_with_automatic_settings",
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
  const localAgent = agents.find(isLocalAgent);
  if (localAgent) {
    return localAgent;
  }
  const networkMountAgent = agents.find(isNetworkMountAgent);
  if (networkMountAgent) {
    return networkMountAgent;
  }

  return agents[0];
};

export const CORE_LOCAL_AGENT = "backup.local";
export const HASSIO_LOCAL_AGENT = "hassio.local";
export const CLOUD_AGENT = "cloud.cloud";

export const isLocalAgent = (agentId: string) =>
  [CORE_LOCAL_AGENT, HASSIO_LOCAL_AGENT].includes(agentId);

export const isNetworkMountAgent = (agentId: string) => {
  const [domain, name] = agentId.split(".");
  return domain === "hassio" && name !== "local";
};

export const computeBackupAgentName = (
  localize: LocalizeFunc,
  agentId: string,
  agentIds?: string[]
) => {
  if (isLocalAgent(agentId)) {
    return localize("ui.panel.config.backup.agents.local_agent");
  }
  const [domain, name] = agentId.split(".");

  if (isNetworkMountAgent(agentId)) {
    return name;
  }

  const domainName = domainToName(localize, domain);

  // If there are multiple agents for a domain, show the name
  const showName = agentIds
    ? agentIds.filter((a) => a.split(".")[0] === domain).length > 1
    : true;

  return showName ? `${domainName}: ${name}` : domainName;
};

export const compareAgents = (a: string, b: string) => {
  const isLocalA = isLocalAgent(a);
  const isLocalB = isLocalAgent(b);
  const isNetworkMountAgentA = isNetworkMountAgent(a);
  const isNetworkMountAgentB = isNetworkMountAgent(b);

  const getPriority = (isLocal: boolean, isNetworkMount: boolean) => {
    if (isLocal) return 1;
    if (isNetworkMount) return 2;
    return 3;
  };

  const priorityA = getPriority(isLocalA, isNetworkMountAgentA);
  const priorityB = getPriority(isLocalB, isNetworkMountAgentB);

  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }

  return a.localeCompare(b);
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

export const generateEmergencyKit = (
  hass: HomeAssistant,
  encryptionKey: string
) =>
  "data:text/plain;charset=utf-8," +
  encodeURIComponent(`${hass.localize("ui.panel.config.backup.emergency_kit_file.title")}

${hass.localize("ui.panel.config.backup.emergency_kit_file.description")}

${hass.localize("ui.panel.config.backup.emergency_kit_file.date")} ${formatDateTime(new Date(), hass.locale, hass.config)}

${hass.localize("ui.panel.config.backup.emergency_kit_file.instance")}
${hass.config.location_name}

${hass.localize("ui.panel.config.backup.emergency_kit_file.url")}
${hass.auth.data.hassUrl}

${hass.localize("ui.panel.config.backup.emergency_kit_file.encryption_key")}
${encryptionKey}

${hass.localize("ui.panel.config.backup.emergency_kit_file.more_info", { link: "https://www.home-assistant.io/more-info/backup-emergency-kit" })}`);

export const geneateEmergencyKitFileName = (
  hass: HomeAssistant,
  append?: string
) =>
  `home_assistant_backup_emergency_kit_${append ? `${append}_` : ""}${formatDateTimeNumeric(new Date(), hass.locale, hass.config).replace(",", "").replace(" ", "_")}.txt`;

export const downloadEmergencyKit = (
  hass: HomeAssistant,
  key: string,
  appendFileName?: string
) =>
  fileDownload(
    generateEmergencyKit(hass, key),
    geneateEmergencyKitFileName(hass, appendFileName)
  );

export const getFormattedBackupTime = memoizeOne(
  (locale: FrontendLocaleData, config: HassConfig) => {
    const date = setMinutes(setHours(new Date(), 4), 45);
    return formatTime(date, locale, config);
  }
);
