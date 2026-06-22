import type {
  BackupAgentsInfo,
  BackupConfig,
  BackupContent,
  BackupInfo,
} from "../../../src/data/backup";
import { BackupScheduleRecurrence } from "../../../src/data/backup";
import type { ManagerStateEvent } from "../../../src/data/backup_manager";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const lastBackupDate = new Date(Date.now() - 86400000).toISOString();
const nextBackupDate = new Date(Date.now() + 86400000).toISOString();

const backups: BackupContent[] = [
  {
    backup_id: "demo-backup-1",
    name: "Automatic backup DEMO",
    date: lastBackupDate,
    with_automatic_settings: true,
    agents: {
      "backup.local": { size: 1024 * 1024 * 512, protected: true },
      "cloud.cloud": { size: 1024 * 1024 * 512, protected: true },
    },
  },
];

const backupInfo: BackupInfo = {
  backups,
  agent_errors: {},
  last_attempted_automatic_backup: lastBackupDate,
  last_completed_automatic_backup: lastBackupDate,
  last_action_event: { manager_state: "idle" },
  next_automatic_backup: nextBackupDate,
  next_automatic_backup_additional: false,
  state: "idle",
};

const backupConfig: BackupConfig = {
  automatic_backups_configured: true,
  last_attempted_automatic_backup: lastBackupDate,
  last_completed_automatic_backup: lastBackupDate,
  next_automatic_backup: nextBackupDate,
  next_automatic_backup_additional: false,
  create_backup: {
    agent_ids: ["backup.local", "cloud.cloud"],
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
  hass.mockWS("backup/info", () => backupInfo);
  hass.mockWS("backup/config/info", () => ({ config: backupConfig }));
  hass.mockWS("backup/agents/info", () => agentsInfo);
  hass.mockWS(
    "backup/subscribe_events",
    (_msg, _hass, onChange?: (event: ManagerStateEvent) => void) => {
      onChange?.({ manager_state: "idle" });
      return () => undefined;
    }
  );
};
