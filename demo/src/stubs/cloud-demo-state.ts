// Demo-only switchable Home Assistant Cloud scenario.
//
// The redesigned cloud account page (src/panels/config/cloud/account) renders
// purely from real WS data. To let reviewers preview every UI state without a
// real cloud account, this module holds a mutable "scenario" that the cloud and
// backup mocks read from, plus the floating <cloud-demo-controls> panel writes
// to. It is persisted to localStorage so the choice survives the data the page
// fetches once per visit (subscription, backup config, webhooks).
//
// This lives entirely under demo/ — no production code imports it.

import type { RemoteCertificateStatus } from "../../../src/data/cloud";

// The five PaymentSubscriptionState values.
export type DemoCloudAccount =
  | "active"
  | "trialing"
  | "canceled"
  | "expired"
  | "unknown";

// "local": automatic backups are configured, but not to the cloud agent
// (a backup exists, just no cloud copy). "none": no automatic backups at all.
export type DemoCloudBackup = "fresh" | "stale" | "failed" | "local" | "none";

export interface CloudDemoScenario {
  account: DemoCloudAccount;
  onboarded: boolean;
  // Onboarding postponed server-side (maps to is_onboarding_postponed); hides
  // the onboarding UI without marking it completed.
  postponed: boolean;
  remote: boolean;
  remoteStatus: RemoteCertificateStatus;
  backup: DemoCloudBackup;
  alexa: boolean;
  google: boolean;
  webrtc: boolean;
  webhooks: boolean;
}

export const DEFAULT_CLOUD_DEMO_SCENARIO: CloudDemoScenario = {
  account: "active",
  onboarded: true,
  postponed: false,
  remote: true,
  remoteStatus: "ready",
  backup: "fresh",
  alexa: true,
  google: true,
  webrtc: true,
  webhooks: true,
};

const STORAGE_KEY = "cloudDemoScenario";

const readScenario = (): CloudDemoScenario => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_CLOUD_DEMO_SCENARIO, ...JSON.parse(raw) };
    }
  } catch (_err) {
    // Ignore malformed or unavailable storage and fall back to the default.
  }
  return { ...DEFAULT_CLOUD_DEMO_SCENARIO };
};

let scenario: CloudDemoScenario = readScenario();

const listeners = new Set<(scenario: CloudDemoScenario) => void>();

export const getCloudDemoScenario = (): CloudDemoScenario => scenario;

export const subscribeCloudDemoScenario = (
  listener: (scenario: CloudDemoScenario) => void
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const setCloudDemoScenario = (
  partial: Partial<CloudDemoScenario>
): void => {
  scenario = { ...scenario, ...partial };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scenario));
  } catch (_err) {
    // Ignore storage failures (e.g. private mode); state still applies in-memory.
  }
  listeners.forEach((listener) => listener(scenario));
};
