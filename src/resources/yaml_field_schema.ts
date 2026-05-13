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

/** A map of YAML key → field schema. Passed to ha-yaml-editor / ha-code-editor. */
export type YamlFieldSchemaMap = Record<string, YamlFieldSchema>;
