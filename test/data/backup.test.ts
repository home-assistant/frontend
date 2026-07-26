import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BackupConfig } from "../../src/data/backup";
import {
  BackupScheduleRecurrence,
  CLOUD_AGENT,
  cloudBackupEnabled,
  cloudBackupHealth,
  isSupportedBackupFile,
} from "../../src/data/backup";

const NOW = "2026-01-01T00:00:00.000Z";

const makeFile = (name: string, type: string): File =>
  new File([""], name, { type });

const makeConfig = (overrides: Partial<BackupConfig> = {}): BackupConfig =>
  ({
    automatic_backups_configured: true,
    last_attempted_automatic_backup: null,
    last_completed_automatic_backup: null,
    next_automatic_backup: null,
    create_backup: {
      agent_ids: [CLOUD_AGENT],
      include_addons: null,
      include_all_addons: false,
      include_database: true,
      include_folders: null,
      name: null,
      password: null,
    },
    retention: {},
    schedule: { recurrence: BackupScheduleRecurrence.DAILY, days: [] },
    agents: {},
    ...overrides,
  }) satisfies BackupConfig;

describe("isSupportedBackupFile", () => {
  it("accepts a .tar with the correct MIME type", () => {
    expect(
      isSupportedBackupFile(makeFile("backup.tar", "application/x-tar"))
    ).toBe(true);
  });

  it("accepts a .tar when the browser reports no MIME type (Firefox on Windows)", () => {
    expect(isSupportedBackupFile(makeFile("backup.tar", ""))).toBe(true);
  });

  it("accepts a .tar reported as a generic binary type", () => {
    expect(
      isSupportedBackupFile(makeFile("backup.tar", "application/octet-stream"))
    ).toBe(true);
  });

  it("accepts regardless of extension casing", () => {
    expect(isSupportedBackupFile(makeFile("BACKUP.TAR", ""))).toBe(true);
  });

  it("rejects a non-tar file", () => {
    expect(isSupportedBackupFile(makeFile("photo.png", "image/png"))).toBe(
      false
    );
  });
});

describe("cloudBackupEnabled", () => {
  it("is false when there is no config", () => {
    expect(cloudBackupEnabled(undefined)).toBe(false);
  });

  it("is false when the cloud agent is not a backup target", () => {
    expect(
      cloudBackupEnabled(
        makeConfig({
          create_backup: {
            ...makeConfig().create_backup,
            agent_ids: ["backup.local"],
          },
        })
      )
    ).toBe(false);
  });

  it("is false when automatic backups are not configured", () => {
    expect(
      cloudBackupEnabled(makeConfig({ automatic_backups_configured: false }))
    ).toBe(false);
  });

  it("is true when the cloud agent is a backup target", () => {
    expect(cloudBackupEnabled(makeConfig())).toBe(true);
  });
});

describe("cloudBackupHealth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is 'none' when the cloud agent is not a backup target", () => {
    expect(
      cloudBackupHealth(
        makeConfig({
          create_backup: {
            ...makeConfig().create_backup,
            agent_ids: ["backup.local"],
          },
          last_completed_automatic_backup: "2025-12-31T00:00:00.000Z",
        })
      )
    ).toBe("none");
  });

  it("is 'none' when there is no attempted or completed backup", () => {
    expect(cloudBackupHealth(makeConfig())).toBe("none");
  });

  it("is 'failed' when the last attempt is newer than the last success", () => {
    expect(
      cloudBackupHealth(
        makeConfig({
          last_completed_automatic_backup: "2025-12-30T00:00:00.000Z",
          last_attempted_automatic_backup: "2025-12-31T00:00:00.000Z",
        })
      )
    ).toBe("failed");
  });

  it("is 'old' when the next scheduled backup is overdue", () => {
    expect(
      cloudBackupHealth(
        makeConfig({
          last_completed_automatic_backup: "2025-12-31T00:00:00.000Z",
          next_automatic_backup: "2025-12-31T12:00:00.000Z",
        })
      )
    ).toBe("old");
  });

  it("is 'success' when the last backup completed and the next is in the future", () => {
    expect(
      cloudBackupHealth(
        makeConfig({
          last_completed_automatic_backup: "2025-12-31T00:00:00.000Z",
          next_automatic_backup: "2026-01-02T00:00:00.000Z",
        })
      )
    ).toBe("success");
  });

  it("is 'success' when completed with no next backup scheduled", () => {
    expect(
      cloudBackupHealth(
        makeConfig({
          last_completed_automatic_backup: "2025-12-31T00:00:00.000Z",
        })
      )
    ).toBe("success");
  });
});
