import type { ConfigEntry } from "../../../../src/data/config_entries";
import type { DeviceRegistryEntry } from "../../../../src/data/device/device_registry";
import type { EntityRegistryEntry } from "../../../../src/data/entity/entity_registry";
import type {
  IntegrationManifest,
  IntegrationType,
} from "../../../../src/data/integration";
import type { TriggerDescriptions } from "../../../../src/data/trigger";
import type { TranslationCategory } from "../../../../src/data/translation";
import type { EntityInput } from "../../../../src/fake_data/entities/types";

export interface DemoConfigEntry {
  entry: ConfigEntry;
  type: IntegrationType;
}

/**
 * Everything one connectivity integration contributes to the demo besides its
 * WebSocket mocks. This is loaded eagerly, together with the registries, so it
 * must not pull in the mocks (which are code-split into the config panel
 * chunk). Each integration owns one of these, so they stay independent.
 */
export interface ConnectivityFixtures {
  /** Components to load, so the integration's panel is reachable. */
  components: string[];
  /** WS command prefixes served by the integration's mock, if it has one. */
  commands?: string[];
  configEntries?: DemoConfigEntry[];
  /** Manifests for the domains above, so their integration pages open. */
  manifests?: IntegrationManifest[];
  devices?: DeviceRegistryEntry[];
  entityRegistryEntries?: EntityRegistryEntry[];
  /** States for the entities above; built lazily so timestamps stay fresh. */
  entities?: () => EntityInput[];
  /** Automation triggers the integration serves to the trigger picker. */
  triggers?: TriggerDescriptions;
  /** Backend translations the panel looks up, by category. */
  backendTranslations?: Partial<
    Record<TranslationCategory, Record<string, string>>
  >;
}
