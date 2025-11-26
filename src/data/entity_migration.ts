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

// Compatibility warning from validation
export interface CompatibilityWarning {
  type: "domain_mismatch" | "device_class_mismatch" | "unit_mismatch";
  message: string;
  source_value?: string;
  target_value?: string;
}

// Result of validating migration compatibility
export interface CompatibilityResult {
  compatible: boolean;
  warnings: CompatibilityWarning[];
  blocking_errors: string[];
}

// Error during migration
export interface MigrationError {
  config_type: string;
  config_id: string;
  message: string;
}

// Result of executing a migration
export interface MigrationResult {
  success: boolean;
  source_entity_id: string;
  target_entity_id: string;
  updated: Record<string, string[]>;
  updated_count: number;
  errors: MigrationError[];
  backup_path?: string;
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

// Validate compatibility between source and target entities
export const validateMigrationCompatibility = (
  hass: HomeAssistant,
  sourceEntityId: string,
  targetEntityId: string
): Promise<CompatibilityResult> =>
  hass.callWS({
    type: "entity_migration/validate",
    source_entity_id: sourceEntityId,
    target_entity_id: targetEntityId,
  });

// Execute migration from source to target entity
export const migrateEntityReferences = (
  hass: HomeAssistant,
  sourceEntityId: string,
  targetEntityId: string,
  options: {
    dry_run?: boolean;
    create_backup?: boolean;
  } = {}
): Promise<MigrationResult> =>
  hass.callWS({
    type: "entity_migration/migrate",
    source_entity_id: sourceEntityId,
    target_entity_id: targetEntityId,
    ...options,
  });
