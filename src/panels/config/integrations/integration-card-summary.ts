import type { ConfigEntry } from "../../../data/config_entries";
import { ERROR_STATES } from "../../../data/config_entries";
import type { DeviceRegistryEntry } from "../../../data/device/device_registry";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";

export type IntegrationCardSummaryUnit =
  "devices" | "services" | "entities" | "entries";

export interface IntegrationCardSummary {
  unit: IntegrationCardSummaryUnit;
  count: number;
  /** Number of items of `unit` that belong to a config entry needing attention. */
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
 * When an entry needing attention owns none of the counted items (for
 * example an entry that never set up and has no devices yet), the summary
 * counts entries instead so the problem is never hidden.
 */
export const computeIntegrationCardSummary = (
  entries: ConfigEntry[],
  devices: DeviceRegistryEntry[],
  entityRegistryEntries: EntityRegistryEntry[],
  entityCount: number
): IntegrationCardSummary | undefined => {
  const attentionEntries = entries.filter(configEntryNeedsAttention);
  const attentionEntryIds = new Set(
    attentionEntries.map((entry) => entry.entry_id)
  );
  const attentionStates = new Set(attentionEntries.map((entry) => entry.state));
  const attentionState =
    attentionStates.size === 1 ? [...attentionStates][0] : undefined;
  const uiEntries = entries.filter((entry) => entry.source !== "yaml");

  // Attention entries that own at least one of the counted items.
  const representedEntryIds = new Set<string>();
  let summary: IntegrationCardSummary | undefined;

  if (devices.length) {
    let attention = 0;
    for (const device of devices) {
      const deviceAttentionIds = device.config_entries.filter((id) =>
        attentionEntryIds.has(id)
      );
      if (deviceAttentionIds.length) {
        attention++;
        deviceAttentionIds.forEach((id) => representedEntryIds.add(id));
      }
    }
    summary = {
      unit: devices.every((device) => device.entry_type === "service")
        ? "services"
        : "devices",
      count: devices.length,
      attention,
    };
  } else if (entityCount > 0) {
    let attention = 0;
    for (const entity of entityRegistryEntries) {
      if (
        entity.config_entry_id &&
        attentionEntryIds.has(entity.config_entry_id)
      ) {
        attention++;
        representedEntryIds.add(entity.config_entry_id);
      }
    }
    summary = {
      unit: "entities",
      count: entityCount,
      attention: Math.min(entityCount, attention),
    };
  } else if (uiEntries.length) {
    return {
      unit: "entries",
      count: uiEntries.length,
      attention: attentionEntryIds.size,
      attentionState,
    };
  }

  if (representedEntryIds.size < attentionEntryIds.size) {
    return {
      unit: "entries",
      count: Math.max(uiEntries.length, attentionEntryIds.size),
      attention: attentionEntryIds.size,
      attentionState,
    };
  }

  return summary && { ...summary, attentionState };
};
