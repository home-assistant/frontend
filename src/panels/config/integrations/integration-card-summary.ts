import type { ConfigEntry } from "../../../data/config_entries";
import { ERROR_STATES } from "../../../data/config_entries";
import type { DeviceRegistryEntry } from "../../../data/device/device_registry";

export type IntegrationCardSummaryUnit =
  "devices" | "services" | "entities" | "entries";

export interface IntegrationCardSummary {
  unit: IntegrationCardSummaryUnit;
  count: number;
  /** Number of config entries needing attention, counted in `entries`. */
  attention: number;
  /**
   * The state shared by all config entries needing attention, or `undefined`
   * when they are in different states.
   */
  attentionState?: ConfigEntry["state"];
}

// Transient states (setup/unload in progress) and "loaded" don't need attention.
const ATTENTION_STATES: ConfigEntry["state"][] = [
  ...ERROR_STATES,
  "not_loaded",
  "failed_unload",
];

// Card state priority, most important first.
const CARD_STATE_PRIORITY: ConfigEntry["state"][] = [
  ...ATTENTION_STATES,
  "setup_in_progress",
  "unload_in_progress",
];

export type IntegrationCardStatusLevel = "error" | "warning" | "progress";

export const CARD_STATE_LEVEL: Partial<
  Record<ConfigEntry["state"], IntegrationCardStatusLevel>
> = {
  setup_error: "error",
  setup_retry: "error",
  migration_error: "error",
  not_loaded: "warning",
  failed_unload: "warning",
  setup_in_progress: "progress",
  unload_in_progress: "progress",
};

export const configEntryNeedsAttention = (entry: ConfigEntry): boolean =>
  ATTENTION_STATES.includes(entry.state);

/**
 * The state the integration card shows for a group of config entries: the
 * most important state of any entry, so the card never looks healthy while
 * one of its entries needs attention.
 */
export const computeIntegrationCardState = (
  entries: ConfigEntry[]
): ConfigEntry["state"] => {
  for (const cardState of CARD_STATE_PRIORITY) {
    if (entries.some((entry) => entry.state === cardState)) {
      return cardState;
    }
  }
  return "loaded";
};

/**
 * Entries needing attention are always counted as entries, not devices or
 * entities: a failing entry may own none of them, and only entries are what
 * the user retries or reconfigures.
 */
export const computeIntegrationCardSummary = (
  entries: ConfigEntry[],
  devices: DeviceRegistryEntry[],
  entityCount: number
): IntegrationCardSummary | undefined => {
  const attentionEntries = entries.filter(configEntryNeedsAttention);
  const uiEntries = entries.filter((entry) => entry.source !== "yaml");

  if (attentionEntries.length) {
    const attentionStates = new Set(
      attentionEntries.map((entry) => entry.state)
    );
    return {
      unit: "entries",
      count: Math.max(uiEntries.length, attentionEntries.length),
      attention: attentionEntries.length,
      attentionState:
        attentionStates.size === 1 ? [...attentionStates][0] : undefined,
    };
  }
  if (devices.length) {
    return {
      unit: devices.every((device) => device.entry_type === "service")
        ? "services"
        : "devices",
      count: devices.length,
      attention: 0,
    };
  }
  if (entityCount > 0) {
    return { unit: "entities", count: entityCount, attention: 0 };
  }
  if (uiEntries.length) {
    return { unit: "entries", count: uiEntries.length, attention: 0 };
  }
  return undefined;
};
