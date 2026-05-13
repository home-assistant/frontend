/**
 * Utilities for converting automation/script field description objects
 * (TriggerDescription, ConditionDescription, HassService.fields) into
 * YamlFieldSchemaMap instances used by the YAML editor for completions,
 * hover tooltips, and linting.
 */

import type { TriggerDescription } from "../../../data/trigger";
import type { ConditionDescription } from "../../../data/condition";
import type { Action } from "../../../data/script";
import type {
  HaFormSchema,
  HaFormSelectSchema,
  HaFormMultiSelectSchema,
} from "../../../components/ha-form/types";
import type {
  YamlFieldSchema,
  YamlFieldSchemaMap,
} from "../../../resources/yaml_field_schema";
import { allowUnknownFields } from "../../../resources/yaml_field_schema";
import type { HomeAssistant } from "../../../types";
import type { LocalizeFunc } from "../../../common/translations/localize";
import {
  TRIGGER_BEHAVIORS,
  CONDITION_BEHAVIORS,
} from "../../../components/ha-selector/ha-selector-automation-behavior";
import {
  SCHEMA as STATE_CONDITION_FORM_SCHEMA,
  computeLabel as stateConditionComputeLabel,
} from "./condition/types/ha-automation-condition-state";
import {
  SCHEMA as TEMPLATE_CONDITION_FORM_SCHEMA,
  computeLabel as templateConditionComputeLabel,
} from "./condition/types/ha-automation-condition-template";
import {
  YAML_SCHEMA as NUMERIC_STATE_CONDITION_FORM_SCHEMA,
  computeLabel as numericStateConditionComputeLabel,
} from "./condition/types/ha-automation-condition-numeric_state";
import {
  YAML_SCHEMA as SUN_CONDITION_FORM_SCHEMA,
  computeLabel as sunConditionComputeLabel,
} from "./condition/types/ha-automation-condition-sun";
import {
  YAML_SCHEMA as TIME_CONDITION_FORM_SCHEMA,
  computeLabel as timeConditionComputeLabel,
} from "./condition/types/ha-automation-condition-time";
import {
  YAML_SCHEMA as TRIGGER_CONDITION_FORM_SCHEMA,
  computeLabel as triggerConditionComputeLabel,
} from "./condition/types/ha-automation-condition-trigger";
import {
  SCHEMA as TEMPLATE_TRIGGER_FORM_SCHEMA,
  computeLabel as templateTriggerComputeLabel,
} from "./trigger/types/ha-automation-trigger-template";
import {
  SCHEMA as TIME_PATTERN_TRIGGER_FORM_SCHEMA,
  computeLabel as timePatternTriggerComputeLabel,
} from "./trigger/types/ha-automation-trigger-time_pattern";
import {
  YAML_SCHEMA as HOMEASSISTANT_TRIGGER_FORM_SCHEMA,
  computeLabel as homeassistantTriggerComputeLabel,
} from "./trigger/types/ha-automation-trigger-homeassistant";
import {
  YAML_SCHEMA as SUN_TRIGGER_FORM_SCHEMA,
  computeLabel as sunTriggerComputeLabel,
} from "./trigger/types/ha-automation-trigger-sun";
import {
  YAML_SCHEMA as CALENDAR_TRIGGER_FORM_SCHEMA,
  computeLabel as calendarTriggerComputeLabel,
} from "./trigger/types/ha-automation-trigger-calendar";
import {
  YAML_SCHEMA as GEO_LOCATION_TRIGGER_FORM_SCHEMA,
  computeLabel as geoLocationTriggerComputeLabel,
} from "./trigger/types/ha-automation-trigger-geo_location";
import {
  YAML_SCHEMA as PERSISTENT_NOTIFICATION_TRIGGER_FORM_SCHEMA,
  computeLabel as persistentNotificationTriggerComputeLabel,
} from "./trigger/types/ha-automation-trigger-persistent_notification";
import {
  YAML_SCHEMA as NUMERIC_STATE_TRIGGER_FORM_SCHEMA,
  computeLabel as numericStateTriggerComputeLabel,
} from "./trigger/types/ha-automation-trigger-numeric_state";
import {
  YAML_SCHEMA as TIME_TRIGGER_FORM_SCHEMA,
  computeLabel as timeTriggerComputeLabel,
} from "./trigger/types/ha-automation-trigger-time";
import {
  YAML_SCHEMA as STATE_TRIGGER_FORM_SCHEMA,
  computeLabel as stateTriggerComputeLabel,
} from "./trigger/types/ha-automation-trigger-state";

// ---------------------------------------------------------------------------
// Converter: HaFormSchema[] → YamlFieldSchemaMap
// ---------------------------------------------------------------------------

/**
 * Convert an `HaFormSchema[]` (used by ha-form UI components) into a
 * `YamlFieldSchemaMap` for the YAML editor.
 *
 * - `HaFormSelector` entries map their `selector` directly.
 * - `type: "select"` entries become `selector: { select: { options } }` with
 *   only the option values (labels are display-only and not needed for YAML).
 * - `type: "grid"` / `type: "expandable"` are flattened into the parent map.
 * - Other typed entries (`boolean`, `integer`, `string`, etc.) get a
 *   best-effort selector so completions still work.
 * - UI-only fields that don't correspond to real YAML keys (e.g. mode-toggle
 *   selects like `lower_limit`) should be excluded by the caller.
 */
export function haFormSchemaToYamlFieldSchemaMap(
  schema: readonly HaFormSchema[],
  getDescription?: (fieldName: string) => string | undefined
): YamlFieldSchemaMap {
  const result: YamlFieldSchemaMap = {};
  for (const field of schema) {
    if (!("name" in field) || !field.name) continue;

    // Flatten grid / expandable containers into the parent map.
    if (
      "type" in field &&
      (field.type === "grid" ||
        field.type === "expandable" ||
        field.type === "optional_actions")
    ) {
      Object.assign(
        result,
        haFormSchemaToYamlFieldSchemaMap(
          (field as { schema: readonly HaFormSchema[] }).schema,
          getDescription
        )
      );
      continue;
    }

    const entry: YamlFieldSchema = {
      required: field.required,
      default: field.default as YamlFieldSchema["default"],
      description: getDescription
        ? getDescription(field.name) || undefined
        : undefined,
    };

    if (!("type" in field) || field.type === undefined) {
      // HaFormSelector – has a `selector` property
      entry.selector = (
        field as { selector: YamlFieldSchema["selector"] }
      ).selector;
    } else if (field.type === "select") {
      const selectField = field as HaFormSelectSchema;
      entry.selector = {
        select: {
          options: selectField.options.map((opt) => ({
            value: opt[0],
            label: opt[1],
          })),
        },
      };
    } else if (field.type === "multi_select") {
      const multiField = field as HaFormMultiSelectSchema;
      const opts = multiField.options;
      const options: { value: string; label: string }[] = Array.isArray(opts)
        ? (opts as readonly (string | readonly [string, string])[]).map(
            (opt) =>
              Array.isArray(opt)
                ? {
                    value: (opt as readonly [string, string])[0],
                    label: (opt as readonly [string, string])[1],
                  }
                : { value: opt as string, label: opt as string }
          )
        : Object.entries(opts as Record<string, string>).map(([v, l]) => ({
            value: v,
            label: l,
          }));
      entry.selector = { select: { multiple: true, options } };
    } else if (field.type === "positive_time_period_dict") {
      entry.selector = { time: null };
    } else {
      // constant, multi_select, or unknown – skip
      continue;
    }

    result[field.name] = entry;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Shared base field sets
// ---------------------------------------------------------------------------

/** Common base fields present on every trigger. */
const TRIGGER_BASE_FIELDS: YamlFieldSchemaMap = {
  trigger: {
    description: "The trigger type (platform).",
    selector: { text: null },
    required: true,
  },
  id: {
    description:
      "An optional ID for the trigger, used to identify it in conditions or templates.",
    selector: { text: null },
  },
  alias: {
    description: "A friendly name for this trigger.",
    selector: { text: null },
  },
  enabled: {
    description: "Whether this trigger is enabled. Defaults to true.",
    selector: { boolean: null },
    default: true,
  },
  variables: {
    description: "Variables to set when this trigger fires.",
    selector: { object: null },
  },
};

/** Common base fields present on every condition. */
const CONDITION_BASE_FIELDS: YamlFieldSchemaMap = {
  condition: {
    description: "The condition type.",
    selector: { text: null },
    required: true,
  },
  alias: {
    description: "A friendly name for this condition.",
    selector: { text: null },
  },
  enabled: {
    description: "Whether this condition is enabled. Defaults to true.",
    selector: { boolean: null },
    default: true,
  },
};

/** Common base fields present on every action. */
export const ACTION_BASE_FIELDS: YamlFieldSchemaMap = {
  alias: {
    description: "A friendly name for this action.",
    selector: { text: null },
  },
  enabled: {
    description: "Whether this action is enabled. Defaults to true.",
    selector: { boolean: null },
    default: true,
  },
  continue_on_error: {
    description: "If true, the automation continues even if this action fails.",
    selector: { boolean: null },
    default: false,
  },
};

// ---------------------------------------------------------------------------
// Built-in action schemas
// ---------------------------------------------------------------------------

const DELAY_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  delay: {
    description:
      "Duration to wait. Can be a number (seconds), a time string (HH:MM:SS), or a mapping with hours/minutes/seconds/milliseconds.",
    selector: { text: null },
    required: true,
    example: "00:00:30",
  },
};

const WAIT_TEMPLATE_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  wait_template: {
    description:
      "A Jinja2 template that must evaluate to true before continuing.",
    selector: { template: null },
    required: true,
  },
  timeout: {
    description:
      "Maximum time to wait. After this the action continues (or stops if continue_on_timeout is false).",
    selector: { text: null },
    example: "00:01:00",
  },
  continue_on_timeout: {
    description:
      "Whether to continue when the timeout is reached. Defaults to true.",
    selector: { boolean: null },
    default: true,
  },
};

const WAIT_FOR_TRIGGER_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  wait_for_trigger: {
    description: "One or more triggers to wait for before continuing.",
    selector: { trigger: null },
    required: true,
  },
  timeout: {
    description: "Maximum time to wait.",
    selector: { text: null },
    example: "00:01:00",
  },
  continue_on_timeout: {
    description:
      "Whether to continue when the timeout is reached. Defaults to true.",
    selector: { boolean: null },
    default: true,
  },
};

const EVENT_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  event: {
    description: "The event type to fire.",
    selector: { text: null },
    required: true,
    example: "my_custom_event",
  },
  event_data: {
    description: "Data to include with the event.",
    selector: { object: null },
  },
  event_data_template: {
    description: "Templated data to include with the event.",
    selector: { object: null },
  },
};

const CONDITION_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  condition: {
    description:
      "The condition type to check. The automation stops if the condition is false.",
    selector: { text: null },
    required: true,
  },
};

const STOP_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  stop: {
    description: "Message to log when stopping the automation.",
    selector: { text: null },
  },
  error: {
    description: "If true, this is logged as an error. Defaults to false.",
    selector: { boolean: null },
    default: false,
  },
  response_variable: {
    description:
      "Variable name to store when stopping and returning a response.",
    selector: { text: null },
  },
};

const REPEAT_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  repeat: {
    description: "Repeat configuration — use count, while, until, or for_each.",
    required: true,
    fields: {
      count: {
        description: "Number of times to repeat.",
        selector: { number: { min: 1 } },
        example: 5,
      },
      while: {
        description: "Repeat while these conditions are true.",
        selector: { condition: null },
      },
      until: {
        description: "Repeat until these conditions are true.",
        selector: { condition: null },
      },
      for_each: {
        description: "List of items to iterate over.",
        selector: { object: null },
      },
      sequence: {
        description: "Actions to perform on each iteration.",
        selector: { action: null },
        required: true,
      },
    },
  },
};

const CHOOSE_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  choose: {
    description: "List of options; the first matching one is executed.",
    required: true,
    fields: {
      conditions: {
        description: "Conditions that must be met for this option to run.",
        selector: { condition: null },
      },
      sequence: {
        description: "Actions to run if the conditions match.",
        selector: { action: null },
        required: true,
      },
      alias: {
        description: "A friendly name for this option.",
        selector: { text: null },
      },
    },
  },
  default: {
    description: "Actions to run when no option matched.",
    selector: { action: null },
  },
};

const IF_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  if: {
    description: "Conditions to check.",
    selector: { condition: null },
    required: true,
  },
  then: {
    description: "Actions to run when the condition is true.",
    selector: { action: null },
    required: true,
  },
  else: {
    description: "Actions to run when the condition is false.",
    selector: { action: null },
  },
};

const SEQUENCE_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  sequence: {
    description: "A list of actions to run in order.",
    selector: { action: null },
    required: true,
  },
};

const PARALLEL_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  parallel: {
    description: "A list of actions (or scripts) to run in parallel.",
    selector: { action: null },
    required: true,
  },
};

const VARIABLES_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  variables: {
    description:
      "Key/value pairs to set as variables in the automation context.",
    selector: { object: null },
    required: true,
  },
};

const SET_CONVERSATION_RESPONSE_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  set_conversation_response: {
    description: "The text response to return to the conversation agent.",
    selector: { text: { multiline: true } },
    required: true,
  },
};

/**
 * Returns a YAML field schema for a known built-in action type, or undefined
 * if the type is not recognised.
 */
export function builtInActionSchema(
  actionType: string
): YamlFieldSchemaMap | undefined {
  switch (actionType) {
    case "delay":
      return DELAY_ACTION_SCHEMA;
    case "wait_template":
      return WAIT_TEMPLATE_ACTION_SCHEMA;
    case "wait_for_trigger":
      return WAIT_FOR_TRIGGER_ACTION_SCHEMA;
    case "event":
    case "fire_event":
      return EVENT_ACTION_SCHEMA;
    case "condition":
    case "check_condition":
      return CONDITION_ACTION_SCHEMA;
    case "stop":
      return STOP_ACTION_SCHEMA;
    case "repeat":
      return REPEAT_ACTION_SCHEMA;
    case "choose":
      return CHOOSE_ACTION_SCHEMA;
    case "if":
      return IF_ACTION_SCHEMA;
    case "sequence":
      return SEQUENCE_ACTION_SCHEMA;
    case "parallel":
      return PARALLEL_ACTION_SCHEMA;
    case "variables":
      return VARIABLES_ACTION_SCHEMA;
    case "set_conversation_response":
      return SET_CONVERSATION_RESPONSE_SCHEMA;
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Built-in condition schemas
// ---------------------------------------------------------------------------

/**
 * Returns a YAML field schema for a known built-in condition type, or undefined
 * if the type is not recognised.
 */
export function builtInConditionSchema(
  conditionType: string,
  localize?: LocalizeFunc
): YamlFieldSchemaMap | undefined {
  const desc = localize
    ? (fn: (n: string, l: LocalizeFunc) => string) => (name: string) =>
        fn(name, localize) || undefined
    : undefined;

  switch (conditionType) {
    case "state":
      return {
        ...CONDITION_BASE_FIELDS,
        ...haFormSchemaToYamlFieldSchemaMap(
          STATE_CONDITION_FORM_SCHEMA,
          desc && desc(stateConditionComputeLabel)
        ),
      };
    case "numeric_state":
      return {
        ...CONDITION_BASE_FIELDS,
        ...haFormSchemaToYamlFieldSchemaMap(
          NUMERIC_STATE_CONDITION_FORM_SCHEMA,
          desc && desc(numericStateConditionComputeLabel)
        ),
      };
    case "template":
      return {
        ...CONDITION_BASE_FIELDS,
        ...haFormSchemaToYamlFieldSchemaMap(
          TEMPLATE_CONDITION_FORM_SCHEMA,
          desc && desc(templateConditionComputeLabel)
        ),
      };
    case "time":
      return {
        ...CONDITION_BASE_FIELDS,
        ...haFormSchemaToYamlFieldSchemaMap(
          TIME_CONDITION_FORM_SCHEMA,
          desc && desc(timeConditionComputeLabel)
        ),
      };
    case "sun":
      return {
        ...CONDITION_BASE_FIELDS,
        ...haFormSchemaToYamlFieldSchemaMap(
          SUN_CONDITION_FORM_SCHEMA,
          desc && desc(sunConditionComputeLabel)
        ),
      };
    case "zone":
      return {
        ...CONDITION_BASE_FIELDS,
        entity_id: {
          description: localize
            ? localize("ui.components.entity.entity-picker.entity") || undefined
            : "The person or device_tracker entity to check.",
          selector: { entity: null },
          required: true,
        },
        zone: {
          description: "The zone the entity must be in.",
          selector: { entity: { domain: "zone" } },
          required: true,
        },
      };
    case "trigger":
      return {
        ...CONDITION_BASE_FIELDS,
        ...haFormSchemaToYamlFieldSchemaMap(
          TRIGGER_CONDITION_FORM_SCHEMA,
          desc && desc(triggerConditionComputeLabel)
        ),
      };
    case "and":
      return {
        ...CONDITION_BASE_FIELDS,
        conditions: {
          description: "All of these conditions must be true.",
          selector: { condition: null },
          required: true,
        },
      };
    case "or":
      return {
        ...CONDITION_BASE_FIELDS,
        conditions: {
          description: "At least one of these conditions must be true.",
          selector: { condition: null },
          required: true,
        },
      };
    case "not":
      return {
        ...CONDITION_BASE_FIELDS,
        conditions: {
          description: "None of these conditions must be true.",
          selector: { condition: null },
          required: true,
        },
      };
    case "device":
    default:
      return allowUnknownFields({ ...CONDITION_BASE_FIELDS });
  }
}

// ---------------------------------------------------------------------------
// Built-in trigger schemas
// ---------------------------------------------------------------------------

/**
 * Returns a YAML field schema for a known built-in trigger type, or undefined
 * if the type is not recognised.
 */
export function builtInTriggerSchema(
  triggerType: string,
  localize?: LocalizeFunc
): YamlFieldSchemaMap | undefined {
  const desc = localize
    ? (fn: (n: string, l: LocalizeFunc) => string) => (name: string) =>
        fn(name, localize) || undefined
    : undefined;

  switch (triggerType) {
    case "state":
      return {
        ...TRIGGER_BASE_FIELDS,
        ...haFormSchemaToYamlFieldSchemaMap(
          STATE_TRIGGER_FORM_SCHEMA,
          desc && desc(stateTriggerComputeLabel)
        ),
      };
    case "numeric_state":
      return {
        ...TRIGGER_BASE_FIELDS,
        ...haFormSchemaToYamlFieldSchemaMap(
          NUMERIC_STATE_TRIGGER_FORM_SCHEMA,
          desc && desc(numericStateTriggerComputeLabel)
        ),
      };
    case "event":
      return {
        ...TRIGGER_BASE_FIELDS,
        event_type: {
          description: "The event type to listen for.",
          selector: { text: null },
          required: true,
          example: "my_custom_event",
        },
        event_data: {
          description: "Optional event data to match.",
          selector: { object: null },
        },
        context: {
          description: "Optional context to match (e.g. user_id).",
          selector: { object: null },
        },
      };
    case "homeassistant":
      return {
        ...TRIGGER_BASE_FIELDS,
        ...haFormSchemaToYamlFieldSchemaMap(
          HOMEASSISTANT_TRIGGER_FORM_SCHEMA,
          desc && desc(homeassistantTriggerComputeLabel)
        ),
      };
    case "template":
      return {
        ...TRIGGER_BASE_FIELDS,
        ...haFormSchemaToYamlFieldSchemaMap(
          TEMPLATE_TRIGGER_FORM_SCHEMA,
          desc && desc(templateTriggerComputeLabel)
        ),
      };
    case "time":
      return {
        ...TRIGGER_BASE_FIELDS,
        ...haFormSchemaToYamlFieldSchemaMap(
          TIME_TRIGGER_FORM_SCHEMA,
          desc && desc(timeTriggerComputeLabel)
        ),
      };
    case "time_pattern":
      return {
        ...TRIGGER_BASE_FIELDS,
        ...haFormSchemaToYamlFieldSchemaMap(
          TIME_PATTERN_TRIGGER_FORM_SCHEMA,
          desc && desc(timePatternTriggerComputeLabel)
        ),
      };
    case "sun":
      return {
        ...TRIGGER_BASE_FIELDS,
        ...haFormSchemaToYamlFieldSchemaMap(
          SUN_TRIGGER_FORM_SCHEMA,
          desc && desc(sunTriggerComputeLabel)
        ),
      };
    case "zone":
      return {
        ...TRIGGER_BASE_FIELDS,
        entity_id: {
          description: "The person or device_tracker entity to watch.",
          selector: { entity: null },
          required: true,
        },
        zone: {
          description: "The zone to watch.",
          selector: { entity: { domain: "zone" } },
          required: true,
        },
        event: {
          description: "Whether to trigger on zone entry or exit.",
          selector: {
            select: {
              options: [
                { value: "enter", label: "Enter" },
                { value: "leave", label: "Leave" },
              ],
            },
          },
          required: true,
        },
      };
    case "tag":
      return {
        ...TRIGGER_BASE_FIELDS,
        tag_id: {
          description: "The NFC/QR tag ID(s) to watch.",
          selector: { text: null },
          required: true,
        },
      };
    case "webhook":
      return {
        ...TRIGGER_BASE_FIELDS,
        webhook_id: {
          description: "The webhook ID. Will be part of the webhook URL.",
          selector: { text: null },
          required: true,
        },
        allowed_methods: {
          description: "HTTP methods that are accepted (default: POST, PUT).",
          selector: {
            select: {
              multiple: true,
              options: [
                { value: "GET", label: "GET" },
                { value: "HEAD", label: "HEAD" },
                { value: "POST", label: "POST" },
                { value: "PUT", label: "PUT" },
              ],
            },
          },
        },
        local_only: {
          description:
            "Only allow requests from the local network. Defaults to true.",
          selector: { boolean: null },
          default: true,
        },
      };
    case "geo_location":
      return {
        ...TRIGGER_BASE_FIELDS,
        ...haFormSchemaToYamlFieldSchemaMap(
          GEO_LOCATION_TRIGGER_FORM_SCHEMA,
          desc && desc(geoLocationTriggerComputeLabel)
        ),
      };
    case "calendar":
      return {
        ...TRIGGER_BASE_FIELDS,
        ...haFormSchemaToYamlFieldSchemaMap(
          CALENDAR_TRIGGER_FORM_SCHEMA,
          desc && desc(calendarTriggerComputeLabel)
        ),
      };
    case "persistent_notification":
      return {
        ...TRIGGER_BASE_FIELDS,
        ...haFormSchemaToYamlFieldSchemaMap(
          PERSISTENT_NOTIFICATION_TRIGGER_FORM_SCHEMA,
          desc && desc(persistentNotificationTriggerComputeLabel)
        ),
      };
    case "conversation":
      return {
        ...TRIGGER_BASE_FIELDS,
        command: {
          description: "The voice command phrase(s) to match.",
          selector: { text: null },
          required: true,
        },
      };
    case "device":
    default:
      return allowUnknownFields({ ...TRIGGER_BASE_FIELDS });
  }
}

// ---------------------------------------------------------------------------
// Conversion functions
// ---------------------------------------------------------------------------

/**
 * Build a `target:` sub-schema from an optional target selector definition.
 * When `targetDef` is provided (e.g. `{ entity: [{ domain: ["light"] }] }`),
 * the `entity_id` selector is scoped to matching entities.
 */
function buildTargetSchema(
  targetDef?: Record<string, any> | null
): YamlFieldSchema {
  return {
    description: "The target entities, devices, areas, floors, or labels.",
    fields: {
      entity_id: {
        description: "One or more entity IDs to target.",
        selector: targetDef ? { entity: targetDef } : { entity: null },
      },
      device_id: {
        description: "One or more device IDs to target.",
        selector: { device: null },
      },
      area_id: {
        description: "One or more area IDs to target.",
        selector: { area: null },
      },
      floor_id: {
        description: "One or more floor IDs to target.",
        selector: { floor: null },
      },
      label_id: {
        description: "One or more label IDs to target.",
        selector: { label: {} },
      },
    },
  };
}

/**
 * Replace an `automation_behavior` selector with a plain `select` selector
 * so the YAML editor can offer value completions and tooltips.
 * Trigger mode: any | first | last
 * Condition mode: any | all
 */
function resolveSelector(
  selector: Record<string, any> | undefined,
  mode: "trigger" | "condition"
): Record<string, any> | undefined {
  if (!selector) return selector;

  if ("automation_behavior" in selector) {
    const options =
      mode === "condition" ? CONDITION_BEHAVIORS : TRIGGER_BEHAVIORS;
    return {
      select: {
        options: options.map((v) => ({ value: v, label: v })),
      },
    };
  }

  if ("numeric_threshold" in selector) {
    return { object: null };
  }

  return selector;
}

/** Sub-schema for a single ThresholdValueEntry (value / value_min / value_max). */
const THRESHOLD_VALUE_ENTRY_FIELDS: YamlFieldSchemaMap = {
  active_choice: {
    description: "Whether to use a fixed number or an entity state.",
    selector: {
      select: {
        options: [
          { value: "number", label: "number" },
          { value: "entity", label: "entity" },
        ],
      },
    },
  },
  number: {
    description: "Fixed numeric value.",
    selector: { number: {} },
  },
  entity: {
    description: "Entity whose state provides the value.",
    selector: { entity: null },
  },
  unit_of_measurement: {
    description: "Unit of measurement.",
    selector: { text: null },
  },
};

/**
 * Build a YamlFieldSchemaMap for a numeric_threshold selector value.
 * type selects the comparison mode; value / value_min / value_max hold the
 * threshold entries depending on the type.
 */
export function numericThresholdSchema(): YamlFieldSchemaMap {
  const valueEntry: YamlFieldSchema = {
    description: "Threshold value entry.",
    selector: { object: null },
    fields: THRESHOLD_VALUE_ENTRY_FIELDS,
  };
  return {
    type: {
      description: "Comparison type.",
      selector: {
        select: {
          options: (
            ["above", "below", "between", "outside", "any"] as const
          ).map((v) => ({ value: v, label: v })),
        },
      },
      required: true,
    },
    value: {
      ...valueEntry,
      description: "Threshold value (for above / below types).",
    },
    value_min: {
      ...valueEntry,
      description: "Lower bound (for between / outside types).",
    },
    value_max: {
      ...valueEntry,
      description: "Upper bound (for between / outside types).",
    },
  };
}

/** Return nested field schema for selectors that have structured sub-keys. */
function selectorFields(
  selector: Record<string, any> | undefined
): YamlFieldSchemaMap | undefined {
  if (selector && "numeric_threshold" in selector) {
    return numericThresholdSchema();
  }
  return undefined;
}

/**
 * Convert a `TriggerDescription` (from subscribeTriggers) into a
 * `YamlFieldSchemaMap` usable by the YAML editor.
 */
export function triggerDescriptionToSchema(
  triggerKey: string,
  desc: TriggerDescription,
  localize: HomeAssistant["localize"]
): YamlFieldSchemaMap {
  const [domain, name] = triggerKey.includes(".")
    ? triggerKey.split(".", 2)
    : [triggerKey, "_"];

  const fieldSchemas: YamlFieldSchemaMap = {};
  for (const [fieldName, field] of Object.entries(desc.fields)) {
    const localizedDesc =
      localize(
        `component.${domain}.triggers.${name}.fields.${fieldName}.description` as any
      ) ||
      localize(
        `component.${domain}.triggers._.fields.${fieldName}.description` as any
      ) ||
      undefined;

    fieldSchemas[fieldName] = {
      description: localizedDesc || undefined,
      selector: resolveSelector(field.selector, "trigger"),
      required: field.required && field.default === undefined,
      example: field.example,
      default: field.default,
      fields: selectorFields(field.selector),
    };
  }

  return {
    ...TRIGGER_BASE_FIELDS,
    ...(desc.target !== undefined
      ? { target: buildTargetSchema(desc.target) }
      : {}),
    ...(Object.keys(fieldSchemas).length > 0
      ? {
          options: {
            description: "Trigger options.",
            selector: { object: null },
            fields: fieldSchemas,
          },
        }
      : {}),
  };
}

/**
 * Convert a `ConditionDescription` into a `YamlFieldSchemaMap`.
 */
export function conditionDescriptionToSchema(
  conditionKey: string,
  desc: ConditionDescription,
  localize: HomeAssistant["localize"]
): YamlFieldSchemaMap {
  const [domain, name] = conditionKey.includes(".")
    ? conditionKey.split(".", 2)
    : [conditionKey, "_"];

  const fieldSchemas: YamlFieldSchemaMap = {};
  for (const [fieldName, field] of Object.entries(desc.fields)) {
    const localizedDesc =
      localize(
        `component.${domain}.conditions.${name}.fields.${fieldName}.description` as any
      ) ||
      localize(
        `component.${domain}.conditions._.fields.${fieldName}.description` as any
      ) ||
      undefined;

    fieldSchemas[fieldName] = {
      description: localizedDesc || undefined,
      selector: resolveSelector(field.selector, "condition"),
      required: field.required && field.default === undefined,
      example: field.example,
      default: field.default,
      fields: selectorFields(field.selector),
    };
  }

  return {
    ...CONDITION_BASE_FIELDS,
    ...(desc.target !== undefined
      ? { target: buildTargetSchema(desc.target) }
      : {}),
    ...(Object.keys(fieldSchemas).length > 0
      ? {
          options: {
            description: "Condition options.",
            selector: { object: null },
            fields: fieldSchemas,
          },
        }
      : {}),
  };
}

/**
 * Build a `YamlFieldSchemaMap` for a service-call action.
 *
 * Uses field descriptions from `hass.services` directly.
 */
export function serviceActionSchema(
  domain: string,
  service: string,
  services: HomeAssistant["services"],
  localize: HomeAssistant["localize"]
): YamlFieldSchemaMap {
  const serviceDef = services?.[domain]?.[service];
  const fieldSchemas: YamlFieldSchemaMap = {};

  if (serviceDef?.fields) {
    for (const [fieldName, field] of Object.entries(serviceDef.fields)) {
      const f = field as any;
      // Fields that have a nested `fields` property are grouping containers
      // (e.g. `advanced_fields` with `collapsed: true`). Hoist their children
      // into the top-level data fields instead of treating the group itself
      // as a key.
      if (f.fields && typeof f.fields === "object") {
        for (const [subFieldName, subField] of Object.entries(f.fields)) {
          const sf = subField as any;
          const localizedSubDesc =
            localize(
              `component.${domain}.services.${service}.fields.${subFieldName}.description` as any
            ) || sf.description;
          fieldSchemas[subFieldName] = {
            description: localizedSubDesc || undefined,
            selector: sf.selector,
            required: sf.required && sf.default === undefined,
            example: sf.example,
            default: sf.default,
          } satisfies YamlFieldSchema;
        }
      } else {
        const localizedDesc =
          localize(
            `component.${domain}.services.${service}.fields.${fieldName}.description` as any
          ) || f.description;
        fieldSchemas[fieldName] = {
          description: localizedDesc || undefined,
          selector: f.selector,
          required: f.required && f.default === undefined,
          example: f.example,
          default: f.default,
        } satisfies YamlFieldSchema;
      }
    }
  }

  // Build target sub-field schemas, forwarding the service's target filter
  // (e.g. { entity: [{ domain: ["light"] }] }) into the entity_id selector
  // so completions are scoped to matching entities.
  const targetDef = (serviceDef as any)?.target;

  return {
    ...ACTION_BASE_FIELDS,
    action: {
      description: `The action to call (${domain}.${service}).`,
      selector: { text: null },
      required: true,
    },
    target: buildTargetSchema(targetDef),
    data: {
      description: "Service call data (field values).",
      fields: fieldSchemas,
      selector: { object: null },
    },
    response_variable: {
      description: "Variable name to store the action response in.",
      selector: { text: null },
    },
  };
}

/**
 * Derive the YAML field schema for any action, combining built-in schemas
 * with service-call schemas from hass.services.
 */
export function actionToYamlSchema(
  action: Action,
  services: HomeAssistant["services"],
  localize: HomeAssistant["localize"]
): YamlFieldSchemaMap | undefined {
  // Service/action calls have an "action" or "service" key.
  if ("action" in action && typeof (action as any).action === "string") {
    const [domain, service] = ((action as any).action as string).split(".", 2);
    if (domain && service) {
      return serviceActionSchema(domain, service, services, localize);
    }
    // Unknown action string — return base fields only.
    return allowUnknownFields({ ...ACTION_BASE_FIELDS });
  }

  // Detect action type from the primary key.
  const actionKey = [
    "delay",
    "wait_template",
    "wait_for_trigger",
    "event",
    "fire_event",
    "condition",
    "stop",
    "repeat",
    "choose",
    "if",
    "sequence",
    "parallel",
    "variables",
    "set_conversation_response",
  ].find((k) => k in (action as any));

  if (actionKey) {
    return builtInActionSchema(actionKey);
  }

  // Unknown — return base fields at minimum so hover/completions still work.
  return allowUnknownFields({ ...ACTION_BASE_FIELDS });
}
