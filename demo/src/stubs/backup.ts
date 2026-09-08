import type {
  BackupAgentsInfo,
  BackupConfig,
  BackupContent,
  BackupInfo,
} from "../../../src/data/backup";
import { BackupScheduleRecurrence } from "../../../src/data/backup";
import type { ManagerStateEvent } from "../../../src/data/backup_manager";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const CLOUD_AGENT = "cloud.cloud";

// Fixed "recent" backup state: an automatic backup completed 12h ago to both the
// local and cloud agents, with the next run scheduled for tomorrow. This is the
// healthy state the cloud overview status line and backup sub-page render.
const now = Date.now();
const recent = new Date(now - 12 * 3600 * 1000).toISOString();
const future = new Date(now + 86400000).toISOString();

const backupInfo: BackupInfo = {
  backups: [
    {
      backup_id: "demo-backup-1",
      name: "Automatic backup DEMO",
      date: recent,
      with_automatic_settings: true,
      agents: {
        "backup.local": { size: 1024 * 1024 * 512, protected: true },
        "cloud.cloud": { size: 1024 * 1024 * 512, protected: true },
      },
    } as BackupContent,
  ],
  agent_errors: {},
  last_attempted_automatic_backup: recent,
  last_completed_automatic_backup: recent,
  last_action_event: { manager_state: "idle" },
  next_automatic_backup: future,
  next_automatic_backup_additional: false,
  state: "idle",
};

const backupConfig: BackupConfig = {
  automatic_backups_configured: true,
  last_attempted_automatic_backup: recent,
  last_completed_automatic_backup: recent,
  next_automatic_backup: future,
  next_automatic_backup_additional: false,
  create_backup: {
    agent_ids: ["backup.local", CLOUD_AGENT],
    include_addons: [],
    include_all_addons: true,
    include_database: true,
    include_folders: [],
    name: null,
    password: null,
  },
  retention: { copies: 3, days: null },
  schedule: {
    recurrence: BackupScheduleRecurrence.DAILY,
    time: null,
    days: [],
  },
  agents: {
    "backup.local": { protected: true, retention: null },
    "cloud.cloud": { protected: true, retention: null },
  },
};

const agentsInfo: BackupAgentsInfo = {
  agents: [
    { agent_id: "backup.local", name: "This device" },
    { agent_id: "cloud.cloud", name: "Home Assistant Cloud" },
  ],
};

export const mockBackup = (hass: MockHomeAssistant) => {
  // Fresh objects each fetch so re-reading after a mutation actually re-renders
  // (Lit change detection is identity-based; the real WS API returns new
  // objects too).
  hass.mockWS("backup/info", () => ({ ...backupInfo }));
  hass.mockWS("backup/config/info", () => ({ config: { ...backupConfig } }));
  hass.mockWS("backup/agents/info", () => agentsInfo);
  hass.mockWS("backup/config/update", (msg) => {
    const { type, ...update } = msg;
    if (update.create_backup) {
      backupConfig.create_backup = {
        ...backupConfig.create_backup,
        ...update.create_backup,
      };
    }
    if (update.automatic_backups_configured !== undefined) {
      backupConfig.automatic_backups_configured =
        update.automatic_backups_configured;
    }
    if (update.schedule) {
      backupConfig.schedule = { ...backupConfig.schedule, ...update.schedule };
    }
    if (update.retention) {
      backupConfig.retention = update.retention;
    }
    if (update.agents) {
      backupConfig.agents = { ...backupConfig.agents, ...update.agents };
    }
    return null;
  });
  hass.mockWS(
    "backup/subscribe_events",
    (_msg, _hass, onChange?: (event: ManagerStateEvent) => void) => {
      onChange?.({ manager_state: "idle" });
      return () => undefined;
    }
  );
};
