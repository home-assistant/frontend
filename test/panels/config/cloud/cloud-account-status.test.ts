import { describe, expect, it } from "vitest";
import type { BackupConfig } from "../../../../src/data/backup";
import {
  BackupScheduleRecurrence,
  CLOUD_AGENT,
} from "../../../../src/data/backup";
import type {
  CloudPreferences,
  CloudStatusLoggedIn,
} from "../../../../src/data/cloud";
import {
  onboardingComplete,
  onboardingPanelCompleted,
} from "../../../../src/panels/config/cloud/account/cloud-account-status";

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

const emptyFilter = () => ({
  include_domains: [],
  include_entities: [],
  exclude_domains: [],
  exclude_entities: [],
});

const makePrefs = (
  overrides: Partial<CloudPreferences> = {}
): CloudPreferences => ({
  google_enabled: true,
  alexa_enabled: true,
  remote_enabled: true,
  remote_allow_remote_enable: true,
  strict_connection: "disabled",
  google_secure_devices_pin: undefined,
  cloudhooks: {},
  alexa_report_state: true,
  google_report_state: true,
  tts_default_voice: ["en-US", "JennyNeural"],
  cloud_ice_servers_enabled: true,
  onboarded_items: [],
  onboarding_postponed_until: null,
  ...overrides,
});

const makeStatus = (
  prefsOverrides: Partial<CloudPreferences> = {},
  overrides: Partial<CloudStatusLoggedIn> = {}
): CloudStatusLoggedIn => ({
  logged_in: true,
  cloud: "connected",
  cloud_last_disconnect_reason: null,
  email: "test@home-assistant.io",
  google_registered: true,
  google_entities: emptyFilter(),
  google_domains: [],
  alexa_registered: true,
  alexa_entities: emptyFilter(),
  prefs: makePrefs(prefsOverrides),
  remote_domain: undefined,
  remote_connected: true,
  remote_certificate: undefined,
  remote_certificate_status: "ready",
  http_use_ssl: false,
  active_subscription: true,
  onboarding_postponed: false,
  onboarding_completed: false,
  ...overrides,
});

// A backup config whose health is "success" without relying on the clock.
const healthyBackup = () =>
  makeConfig({ last_completed_automatic_backup: "2025-12-31T00:00:00.000Z" });

describe("onboardingPanelCompleted", () => {
  it("remote is completed when remote access is enabled", () => {
    expect(
      onboardingPanelCompleted("remote", makeStatus({ remote_enabled: true }))
    ).toBe(true);
    expect(
      onboardingPanelCompleted("remote", makeStatus({ remote_enabled: false }))
    ).toBe(false);
  });

  it("backup is completed when a cloud backup has succeeded", () => {
    expect(
      onboardingPanelCompleted("backup", makeStatus(), healthyBackup())
    ).toBe(true);
    expect(onboardingPanelCompleted("backup", makeStatus(), makeConfig())).toBe(
      false
    );
    expect(onboardingPanelCompleted("backup", makeStatus(), undefined)).toBe(
      false
    );
  });

  it("voice is completed when Alexa or Google is registered", () => {
    expect(
      onboardingPanelCompleted(
        "voice",
        makeStatus({}, { alexa_registered: true, google_registered: false })
      )
    ).toBe(true);
    expect(
      onboardingPanelCompleted(
        "voice",
        makeStatus({}, { alexa_registered: false, google_registered: true })
      )
    ).toBe(true);
    expect(
      onboardingPanelCompleted(
        "voice",
        makeStatus({}, { alexa_registered: false, google_registered: false })
      )
    ).toBe(false);
  });

  it("streaming is completed when cloud ICE servers are enabled", () => {
    expect(
      onboardingPanelCompleted(
        "streaming",
        makeStatus({ cloud_ice_servers_enabled: true })
      )
    ).toBe(true);
    expect(
      onboardingPanelCompleted(
        "streaming",
        makeStatus({ cloud_ice_servers_enabled: false })
      )
    ).toBe(false);
  });
});

describe("onboardingComplete", () => {
  it("is true when every step is set up", () => {
    expect(onboardingComplete(makeStatus(), healthyBackup())).toBe(true);
  });

  it("is false when the backup step is not set up", () => {
    expect(onboardingComplete(makeStatus(), makeConfig())).toBe(false);
  });

  it("is false when remote access is off", () => {
    expect(
      onboardingComplete(makeStatus({ remote_enabled: false }), healthyBackup())
    ).toBe(false);
  });

  it("is false when streaming is off", () => {
    expect(
      onboardingComplete(
        makeStatus({ cloud_ice_servers_enabled: false }),
        healthyBackup()
      )
    ).toBe(false);
  });

  it("is false when no voice assistant is registered", () => {
    expect(
      onboardingComplete(
        makeStatus({}, { alexa_registered: false, google_registered: false }),
        healthyBackup()
      )
    ).toBe(false);
  });
});
