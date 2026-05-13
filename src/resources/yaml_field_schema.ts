import type { Selector } from "../data/selector";

/**
 * Describes a single field in a YAML schema used for editor assistance
 * (completions, hover tooltips, and linting) in ha-yaml-editor / ha-code-editor.
 *
 * This is intentionally kept separate from superstruct structs (which are
 * runtime-validation only) and from ha-form schemas (which drive form UI).
 * It maps closely to the shape of TriggerDescription.fields,
 * ConditionDescription.fields, and HassService.fields so the automation editor
 * can forward those descriptions into the YAML editor with minimal conversion.
 */
export interface YamlFieldSchema {
  /** Human-readable description shown in the hover tooltip. */
  description?: string;
  /**
   * Selector driving value completions and type hints. When present,
   * the completion source will offer relevant value suggestions based on
   * the selector type (boolean → true/false, select → option list, etc.).
   */
  selector?: Selector;
  /** Whether the field is required (shown in the hover tooltip). */
  required?: boolean;
  /** Example value shown in the hover tooltip. */
  example?: unknown;
  /** Default value shown in the hover tooltip. */
  default?: unknown;
  /**
   * Nested field schema for object/mapping values.  When set, drilling
   * into this key's value will offer the nested fields as completions.
   */
  fields?: YamlFieldSchemaMap;
}

/**
 * A map of YAML key → field schema. Passed to ha-yaml-editor / ha-code-editor.
 *
 * The optional `__allowUnknownFields` marker suppresses "unknown field"
 * lint warnings for this mapping level. Use it for schemas where the full
 * set of valid keys is not statically known (e.g. device triggers/conditions/
 * actions that accept integration-specific fields).
 *
 * Note: `__allowUnknownFields` is set as a non-enumerable property so it does
 * not appear in Object.keys() / Object.entries() iteration used for completions
 * and required-field checks.
 */
export type YamlFieldSchemaMap = Record<string, YamlFieldSchema>;

/**
 * Mark a `YamlFieldSchemaMap` so that the linter does not warn about unknown
 * keys at this mapping level. Returns the same object for convenience.
 */
export function allowUnknownFields(
  map: YamlFieldSchemaMap
): YamlFieldSchemaMap {
  Object.defineProperty(map, "__allowUnknownFields", {
    value: true,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return map;
}

/** Return true if the map was marked via `allowUnknownFields()`. */
export function hasAllowUnknownFields(map: YamlFieldSchemaMap): boolean {
  return (map as any).__allowUnknownFields === true;
}
