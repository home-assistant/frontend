import type { HomeAssistant } from "../types";

// Reference found during scan
export interface EntityReference {
  config_type: string;
  config_id: string;
  config_name: string;
  location: string;
  file_path?: string;
}

// Result of scanning an entity for references
export interface ScanResult {
  entity_id: string;
  references: Record<string, EntityReference[]>;
  total_count: number;
}

// Scan for all references to an entity
export const scanEntityReferences = (
  hass: HomeAssistant,
  entityId: string
): Promise<ScanResult> =>
  hass.callWS({
    type: "entity_migration/scan",
    entity_id: entityId,
  });
