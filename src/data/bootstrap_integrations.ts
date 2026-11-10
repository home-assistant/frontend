import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  STATE_NOT_RUNNING,
  STATE_RUNNING,
  STATE_STARTING,
} from "home-assistant-js-websocket";
import type { HomeAssistant } from "../types";

export type BootstrapIntegrationsTimings = Record<string, number>;

export type BootstrapPhase =
  "preparing" | "setup" | "wrap_up" | "starting" | "running";

export interface BootstrapProgress {
  phase: BootstrapPhase;
  stage: string | null;
  // Seconds since integration setup started.
  elapsed: number;
  integrations: {
    // Integrations scheduled by bootstrap, including dependencies. Null while resolving.
    total: number | null;
    // Integrations whose setup attempt finished, successful or not.
    done: number;
    failed: string[];
  };
  config_entries: {
    total: number;
    done: number;
    retrying: string[];
    failed: string[];
  };
  // Domain to seconds since its oldest pending setup started.
  active: Record<string, number>;
}

export interface StartupProgressView {
  phase: BootstrapPhase;
  // Share of scheduled integrations that finished setup, not of startup time.
  // Undefined when the indicator must be indeterminate.
  percent?: number;
  done: number;
  total: number | null;
  elapsed?: number;
  active: [domain: string, seconds: number][];
  failed: string[];
  retrying: string[];
  finished: boolean;
}

export type StartupTransition = "show" | "finish" | "none";

export const subscribeBootstrapIntegrations = (
  hass: HomeAssistant,
  callback: (message: BootstrapIntegrationsTimings) => void
) => {
  const unsubProm =
    hass.connection.subscribeMessage<BootstrapIntegrationsTimings>(
      (message) => callback(message),
      {
        type: "subscribe_bootstrap_integrations",
      }
    );

  return unsubProm;
};

export const legacyTimingsToProgress = (
  timings: BootstrapIntegrationsTimings
): BootstrapProgress => ({
  phase: Object.keys(timings).length ? "setup" : "wrap_up",
  stage: null,
  elapsed: 0,
  integrations: { total: null, done: 0, failed: [] },
  config_entries: { total: 0, done: 0, retrying: [], failed: [] },
  active: timings,
});

export const subscribeBootstrapProgress = (
  hass: HomeAssistant,
  callback: (message: BootstrapProgress) => void
): Promise<UnsubscribeFunc> =>
  hass.connection
    .subscribeMessage<BootstrapProgress>(callback, {
      type: "subscribe_bootstrap_progress",
    })
    .catch((err) => {
      if (err?.code !== "unknown_command") {
        throw err;
      }
      // Older cores only report the integrations that are setting up.
      return subscribeBootstrapIntegrations(hass, (timings) =>
        callback(legacyTimingsToProgress(timings))
      );
    });

const PHASE_ORDER: BootstrapPhase[] = [
  "preparing",
  "setup",
  "wrap_up",
  "starting",
  "running",
];

export const computeStartupProgress = (
  progress: BootstrapProgress | undefined,
  coreState: string
): StartupProgressView => {
  // The core state is authoritative; progress messages can lag behind it.
  const statePhase: BootstrapPhase | undefined =
    coreState === STATE_RUNNING
      ? "running"
      : coreState === STATE_STARTING
        ? "starting"
        : undefined;
  const messagePhase = progress?.phase ?? "preparing";
  const phase =
    statePhase &&
    PHASE_ORDER.indexOf(statePhase) > PHASE_ORDER.indexOf(messagePhase)
      ? statePhase
      : messagePhase;
  const total = progress?.integrations.total ?? null;
  const done = progress?.integrations.done ?? 0;
  const failed = new Set([
    ...(progress?.integrations.failed ?? []),
    ...(progress?.config_entries.failed ?? []),
  ]);
  return {
    phase,
    percent:
      phase === "setup" && total
        ? Math.min(100, Math.round((done / total) * 100))
        : undefined,
    done,
    total,
    // Counts from integration setup and stops updating once bootstrap is done.
    elapsed: phase === "setup" ? progress?.elapsed || undefined : undefined,
    active: Object.entries(progress?.active ?? {}).sort(
      ([, a], [, b]) => b - a
    ),
    failed: [...failed].sort(),
    retrying: (progress?.config_entries.retrying ?? []).filter(
      (domain) => !failed.has(domain)
    ),
    finished: coreState === STATE_RUNNING,
  };
};

export const startupTransition = (
  oldState: string | undefined,
  newState: string
): StartupTransition => {
  if (oldState === newState) {
    return "none";
  }
  if (newState === STATE_NOT_RUNNING || newState === STATE_STARTING) {
    // Startup is not finished in STARTING, so keep the indicator from NOT_RUNNING.
    return oldState === STATE_NOT_RUNNING ? "none" : "show";
  }
  if (
    newState === STATE_RUNNING &&
    (oldState === STATE_NOT_RUNNING || oldState === STATE_STARTING)
  ) {
    return "finish";
  }
  return "none";
};
