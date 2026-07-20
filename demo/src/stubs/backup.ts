import type {
  BackupAgentsInfo,
  BackupConfig,
  BackupContent,
  BackupInfo,
} from "../../../src/data/backup";
import { BackupScheduleRecurrence } from "../../../src/data/backup";
import type { ManagerStateEvent } from "../../../src/data/backup_manager";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import type { DemoCloudBackup } from "./cloud-demo-state";
import {
  getCloudDemoScenario,
  setCloudDemoScenario,
  subscribeCloudDemoScenario,
} from "./cloud-demo-state";

const CLOUD_AGENT = "cloud.cloud";

const backupInfo: BackupInfo = {
  backups: [],
  agent_errors: {},
  last_attempted_automatic_backup: null,
  last_completed_automatic_backup: null,
  last_action_event: { manager_state: "idle" },
  next_automatic_backup: null,
  next_automatic_backup_additional: false,
  state: "idle",
};

const backupConfig: BackupConfig = {
  automatic_backups_configured: true,
  last_attempted_automatic_backup: null,
  last_completed_automatic_backup: null,
  next_automatic_backup: null,
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

// Map the demo "Backups" scenario onto the mutable backup config/info, so the
// cloud overview status line and the backup sub-page reflect the chosen state.
const applyScenario = () => {
  const kind = getCloudDemoScenario().backup;
  const now = Date.now();
  const recent = new Date(now - 12 * 3600 * 1000).toISOString();
  const old = new Date(now - 5 * 86400000).toISOString();
  const future = new Date(now + 86400000).toISOString();
  // Comfortably past BACKUP_OVERDUE_MARGIN_HOURS (3h) so the "stale" scenario
  // actually reads as overdue rather than slipping under the margin.
  const overdue = new Date(now - 6 * 3600 * 1000).toISOString();

  // The cloud agent is a backup target for the cloud-backed states only. For
  // "local" a backup exists but is stored locally (no cloud copy), and for
  // "none" there are no automatic backups at all.
  const cloudEnabled =
    kind === "fresh" || kind === "stale" || kind === "failed";
  backupConfig.create_backup.agent_ids = cloudEnabled
    ? ["backup.local", CLOUD_AGENT]
    : ["backup.local"];

  switch (kind) {
    case "fresh":
      backupConfig.automatic_backups_configured = true;
      backupConfig.last_completed_automatic_backup = recent;
      backupConfig.last_attempted_automatic_backup = recent;
      backupConfig.next_automatic_backup = future;
      break;
    case "local":
      // Automatic backups run, but only to the local agent.
      backupConfig.automatic_backups_configured = true;
      backupConfig.last_completed_automatic_backup = recent;
      backupConfig.last_attempted_automatic_backup = recent;
      backupConfig.next_automatic_backup = future;
      break;
    case "stale":
      backupConfig.automatic_backups_configured = true;
      backupConfig.last_completed_automatic_backup = old;
      backupConfig.last_attempted_automatic_backup = old;
      // Next scheduled backup is in the past, so it reads as overdue.
      backupConfig.next_automatic_backup = overdue;
      break;
    case "failed":
      backupConfig.automatic_backups_configured = true;
      backupConfig.last_completed_automatic_backup = old;
      // Most recent attempt is newer than the last success, so it failed.
      backupConfig.last_attempted_automatic_backup = recent;
      backupConfig.next_automatic_backup = future;
      break;
    case "none":
      backupConfig.automatic_backups_configured = false;
      backupConfig.last_completed_automatic_backup = null;
      backupConfig.last_attempted_automatic_backup = null;
      backupConfig.next_automatic_backup = null;
      break;
  }

  backupInfo.last_completed_automatic_backup =
    backupConfig.last_completed_automatic_backup;
  backupInfo.last_attempted_automatic_backup =
    backupConfig.last_attempted_automatic_backup;
  backupInfo.next_automatic_backup = backupConfig.next_automatic_backup;
  backupInfo.backups =
    cloudEnabled && backupConfig.last_completed_automatic_backup
      ? [
          {
            backup_id: "demo-backup-1",
            name: "Automatic backup DEMO",
            date: backupConfig.last_completed_automatic_backup,
            with_automatic_settings: true,
            agents: {
              "backup.local": { size: 1024 * 1024 * 512, protected: true },
              "cloud.cloud": { size: 1024 * 1024 * 512, protected: true },
            },
          } as BackupContent,
        ]
      : [];
};

applyScenario();
subscribeCloudDemoScenario(applyScenario);

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
    // Reflect the UI-driven backup change into the demo scenario so the demo
    // controls panel stays in sync with the mocked state.
    const cloudNow = backupConfig.create_backup.agent_ids.includes(CLOUD_AGENT);
    const current = getCloudDemoScenario().backup;
    const next: DemoCloudBackup = !backupConfig.automatic_backups_configured
      ? "none"
      : cloudNow
        ? current === "fresh" || current === "stale" || current === "failed"
          ? current
          : "fresh"
        : "local";
    if (next !== current) {
      setCloudDemoScenario({ backup: next });
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
