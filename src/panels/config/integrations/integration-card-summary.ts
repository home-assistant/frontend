import type { ConfigEntry } from "../../../data/config_entries";
import { ERROR_STATES } from "../../../data/config_entries";
import type { DeviceRegistryEntry } from "../../../data/device/device_registry";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";

export type IntegrationCardSummaryUnit =
  "devices" | "services" | "entities" | "entries";

export interface IntegrationCardSummary {
  unit: IntegrationCardSummaryUnit;
  /** Total number of items of `unit`. */
  count: number;
  /** Number of items of `unit` that belong to a config entry needing attention. */
  attention: number;
}

// Transient states (setup/unload in progress) and "loaded" don't need attention.
const ATTENTION_STATES: ConfigEntry["state"][] = [
  ...ERROR_STATES,
  "not_loaded",
  "failed_unload",
];

export const configEntryNeedsAttention = (entry: ConfigEntry): boolean =>
  ATTENTION_STATES.includes(entry.state);

/**
 * Compute what the integration card shows as supporting text: the number of
 * devices, services, entities or entries, and how many of those belong to a
 * config entry that needs attention.
 *
 * When some entries need attention but own none of the counted items (for
 * example an entry that never set up and has no devices yet), the summary
 * falls back to counting entries so the problem is never hidden.
 */
export const computeIntegrationCardSummary = (
  entries: ConfigEntry[],
  devices: DeviceRegistryEntry[],
  entityRegistryEntries: EntityRegistryEntry[],
  entityCount: number
): IntegrationCardSummary | undefined => {
  const attentionEntryIds = new Set(
    entries.filter(configEntryNeedsAttention).map((entry) => entry.entry_id)
  );
  const uiEntries = entries.filter((entry) => entry.source !== "yaml");

  let summary: IntegrationCardSummary | undefined;

  if (devices.length) {
    summary = {
      unit: devices.every((device) => device.entry_type === "service")
        ? "services"
        : "devices",
      count: devices.length,
      attention: devices.filter((device) =>
        device.config_entries.some((id) => attentionEntryIds.has(id))
      ).length,
    };
  } else if (entityCount > 0) {
    summary = {
      unit: "entities",
      count: entityCount,
      attention: Math.min(
        entityCount,
        entityRegistryEntries.filter(
          (entity) =>
            entity.config_entry_id &&
            attentionEntryIds.has(entity.config_entry_id)
        ).length
      ),
    };
  } else if (uiEntries.length) {
    summary = {
      unit: "entries",
      count: uiEntries.length,
      attention: attentionEntryIds.size,
    };
  }

  if (attentionEntryIds.size && !summary?.attention) {
    return {
      unit: "entries",
      count: Math.max(uiEntries.length, attentionEntryIds.size),
      attention: attentionEntryIds.size,
    };
  }

  return summary;
};
