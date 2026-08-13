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
import type { Selector, TargetSelector } from "../../../data/selector";
import type { HomeAssistant } from "../../../types";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../common/translations/localize";
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
    description:
      "ui.panel.config.automation.editor.yaml_schema.trigger_base.trigger",
    selector: { text: null },
    required: true,
  },
  id: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.trigger_base.id",
    selector: { text: null },
  },
  alias: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.trigger_base.alias",
    selector: { text: null },
  },
  enabled: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.trigger_base.enabled",
    selector: { boolean: null },
    default: true,
  },
  variables: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.trigger_base.variables",
    selector: { object: null },
  },
};

/** Common base fields present on every condition. */
const CONDITION_BASE_FIELDS: YamlFieldSchemaMap = {
  condition: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.condition_base.condition",
    selector: { text: null },
    required: true,
  },
  alias: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.condition_base.alias",
    selector: { text: null },
  },
  enabled: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.condition_base.enabled",
    selector: { boolean: null },
    default: true,
  },
};

/** Common base fields present on every action. */
export const ACTION_BASE_FIELDS: YamlFieldSchemaMap = {
  alias: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.action_base.alias",
    selector: { text: null },
  },
  enabled: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.action_base.enabled",
    selector: { boolean: null },
    default: true,
  },
  continue_on_error: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.action_base.continue_on_error",
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
      "ui.panel.config.automation.editor.yaml_schema.actions.delay.delay",
    selector: { text: null },
    required: true,
    example: "00:00:30",
  },
};

const WAIT_TEMPLATE_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  wait_template: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.wait_template.wait_template",
    selector: { template: null },
    required: true,
  },
  timeout: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.wait_template.timeout",
    selector: { text: null },
    example: "00:01:00",
  },
  continue_on_timeout: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.wait_template.continue_on_timeout",
    selector: { boolean: null },
    default: true,
  },
};

const WAIT_FOR_TRIGGER_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  wait_for_trigger: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.wait_for_trigger.wait_for_trigger",
    selector: { trigger: null },
    required: true,
  },
  timeout: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.wait_for_trigger.timeout",
    selector: { text: null },
    example: "00:01:00",
  },
  continue_on_timeout: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.wait_for_trigger.continue_on_timeout",
    selector: { boolean: null },
    default: true,
  },
};

const EVENT_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  event: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.event.event",
    selector: { text: null },
    required: true,
    example: "my_custom_event",
  },
  event_data: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.event.event_data",
    selector: { object: null },
  },
  event_data_template: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.event.event_data_template",
    selector: { object: null },
  },
};

const CONDITION_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  condition: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.condition.condition",
    selector: { text: null },
    required: true,
  },
};

const STOP_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  stop: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.stop.stop",
    selector: { text: null },
  },
  error: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.stop.error",
    selector: { boolean: null },
    default: false,
  },
  response_variable: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.stop.response_variable",
    selector: { text: null },
  },
};

const REPEAT_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  repeat: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.repeat.repeat",
    required: true,
    fields: {
      count: {
        description:
          "ui.panel.config.automation.editor.yaml_schema.actions.repeat.count",
        selector: { number: { min: 1 } },
        example: 5,
      },
      while: {
        description:
          "ui.panel.config.automation.editor.yaml_schema.actions.repeat.while",
        selector: { condition: null },
      },
      until: {
        description:
          "ui.panel.config.automation.editor.yaml_schema.actions.repeat.until",
        selector: { condition: null },
      },
      for_each: {
        description:
          "ui.panel.config.automation.editor.yaml_schema.actions.repeat.for_each",
        selector: { object: null },
      },
      sequence: {
        description:
          "ui.panel.config.automation.editor.yaml_schema.actions.repeat.sequence",
        selector: { action: null },
        required: true,
      },
    },
  },
};

const CHOOSE_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  choose: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.choose.choose",
    required: true,
    fields: {
      conditions: {
        description:
          "ui.panel.config.automation.editor.yaml_schema.actions.choose.conditions",
        selector: { condition: null },
      },
      sequence: {
        description:
          "ui.panel.config.automation.editor.yaml_schema.actions.choose.sequence",
        selector: { action: null },
        required: true,
      },
      alias: {
        description:
          "ui.panel.config.automation.editor.yaml_schema.actions.choose.alias",
        selector: { text: null },
      },
    },
  },
  default: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.choose.default",
    selector: { action: null },
  },
};

const IF_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  if: {
    description: "ui.panel.config.automation.editor.yaml_schema.actions.if.if",
    selector: { condition: null },
    required: true,
  },
  then: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.if.then",
    selector: { action: null },
    required: true,
  },
  else: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.if.else",
    selector: { action: null },
  },
};

const SEQUENCE_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  sequence: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.sequence.sequence",
    selector: { action: null },
    required: true,
  },
};

const PARALLEL_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  parallel: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.parallel.parallel",
    selector: { action: null },
    required: true,
  },
};

const VARIABLES_ACTION_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  variables: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.variables.variables",
    selector: { object: null },
    required: true,
  },
};

const SET_CONVERSATION_RESPONSE_SCHEMA: YamlFieldSchemaMap = {
  ...ACTION_BASE_FIELDS,
  set_conversation_response: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.actions.set_conversation_response.set_conversation_response",
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
          description:
            "ui.panel.config.automation.editor.yaml_schema.conditions.zone.entity_id",
          selector: { entity: null },
          required: true,
        },
        zone: {
          description:
            "ui.panel.config.automation.editor.yaml_schema.conditions.zone.zone",
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
          description:
            "ui.panel.config.automation.editor.yaml_schema.conditions.and.conditions",
          selector: { condition: null },
          required: true,
        },
      };
    case "or":
      return {
        ...CONDITION_BASE_FIELDS,
        conditions: {
          description:
            "ui.panel.config.automation.editor.yaml_schema.conditions.or.conditions",
          selector: { condition: null },
          required: true,
        },
      };
    case "not":
      return {
        ...CONDITION_BASE_FIELDS,
        conditions: {
          description:
            "ui.panel.config.automation.editor.yaml_schema.conditions.not.conditions",
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
          description:
            "ui.panel.config.automation.editor.yaml_schema.triggers.event.event_type",
          selector: { text: null },
          required: true,
          example: "my_custom_event",
        },
        event_data: {
          description:
            "ui.panel.config.automation.editor.yaml_schema.triggers.event.event_data",
          selector: { object: null },
        },
        context: {
          description:
            "ui.panel.config.automation.editor.yaml_schema.triggers.event.context",
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
          description:
            "ui.panel.config.automation.editor.yaml_schema.triggers.zone.entity_id",
          selector: { entity: null },
          required: true,
        },
        zone: {
          description:
            "ui.panel.config.automation.editor.yaml_schema.triggers.zone.zone",
          selector: { entity: { domain: "zone" } },
          required: true,
        },
        event: {
          description:
            "ui.panel.config.automation.editor.yaml_schema.triggers.zone.event",
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
          description:
            "ui.panel.config.automation.editor.yaml_schema.triggers.tag.tag_id",
          selector: { text: null },
          required: true,
        },
      };
    case "webhook":
      return {
        ...TRIGGER_BASE_FIELDS,
        webhook_id: {
          description:
            "ui.panel.config.automation.editor.yaml_schema.triggers.webhook.webhook_id",
          selector: { text: null },
          required: true,
        },
        allowed_methods: {
          description:
            "ui.panel.config.automation.editor.yaml_schema.triggers.webhook.allowed_methods",
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
            "ui.panel.config.automation.editor.yaml_schema.triggers.webhook.local_only",
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
          description:
            "ui.panel.config.automation.editor.yaml_schema.triggers.conversation.command",
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
 * its filters are forwarded so `entity_id` / `device_id` completions are
 * scoped to matching entities and devices.
 */
function buildTargetSchema(
  targetDef?: TargetSelector["target"]
): YamlFieldSchema {
  return {
    description: "ui.panel.config.automation.editor.yaml_schema.target.target",
    fields: {
      entity_id: {
        description:
          "ui.panel.config.automation.editor.yaml_schema.target.entity_id",
        selector: {
          entity: { multiple: true, filter: targetDef?.entity },
        },
      },
      device_id: {
        description:
          "ui.panel.config.automation.editor.yaml_schema.target.device_id",
        selector: { device: { multiple: true, filter: targetDef?.device } },
      },
      area_id: {
        description:
          "ui.panel.config.automation.editor.yaml_schema.target.area_id",
        selector: { area: null },
      },
      floor_id: {
        description:
          "ui.panel.config.automation.editor.yaml_schema.target.floor_id",
        selector: { floor: null },
      },
      label_id: {
        description:
          "ui.panel.config.automation.editor.yaml_schema.target.label_id",
        selector: { label: {} },
      },
    },
  };
}

/**
 * Replace an `automation_behavior` selector with a plain `select` selector
 * so the YAML editor can offer value completions and tooltips. The options are
 * the same ones ha-selector-automation_behavior offers.
 */
function resolveSelector(
  selector: Selector | undefined,
  mode: "trigger" | "condition"
): Selector | undefined {
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
    description:
      "ui.panel.config.automation.editor.yaml_schema.numeric_threshold.active_choice",
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
    description:
      "ui.panel.config.automation.editor.yaml_schema.numeric_threshold.number",
    selector: { number: {} },
  },
  entity: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.numeric_threshold.entity",
    selector: { entity: null },
  },
  unit_of_measurement: {
    description:
      "ui.panel.config.automation.editor.yaml_schema.numeric_threshold.unit_of_measurement",
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
    description:
      "ui.panel.config.automation.editor.yaml_schema.numeric_threshold.value_entry",
    selector: { object: null },
    fields: THRESHOLD_VALUE_ENTRY_FIELDS,
  };
  return {
    type: {
      description:
        "ui.panel.config.automation.editor.yaml_schema.numeric_threshold.type",
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
      description:
        "ui.panel.config.automation.editor.yaml_schema.numeric_threshold.value",
    },
    value_min: {
      ...valueEntry,
      description:
        "ui.panel.config.automation.editor.yaml_schema.numeric_threshold.value_min",
    },
    value_max: {
      ...valueEntry,
      description:
        "ui.panel.config.automation.editor.yaml_schema.numeric_threshold.value_max",
    },
  };
}

/** Return nested field schema for selectors that have structured sub-keys. */
function selectorFields(
  selector: Selector | undefined
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
        `component.${domain}.triggers.${name}.fields.${fieldName}.description` as LocalizeKeys
      ) ||
      localize(
        `component.${domain}.triggers._.fields.${fieldName}.description` as LocalizeKeys
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
            description:
              "ui.panel.config.automation.editor.yaml_schema.triggers.options",
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
        `component.${domain}.conditions.${name}.fields.${fieldName}.description` as LocalizeKeys
      ) ||
      localize(
        `component.${domain}.conditions._.fields.${fieldName}.description` as LocalizeKeys
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
            description:
              "ui.panel.config.automation.editor.yaml_schema.conditions.options",
            selector: { object: null },
            fields: fieldSchemas,
          },
        }
      : {}),
  };
}

/**
 * A field of a service description. `HassService["fields"]` types its values
 * loosely; this is the shape the frontend actually gets, including the nested
 * `fields` used by collapsible field groups.
 */
interface ServiceField {
  description?: string;
  selector?: unknown;
  required?: boolean;
  example?: unknown;
  default?: unknown;
  fields?: Record<string, ServiceField>;
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

  const addField = (fieldName: string, field: ServiceField) => {
    fieldSchemas[fieldName] = {
      description:
        localize(
          `component.${domain}.services.${service}.fields.${fieldName}.description` as LocalizeKeys
        ) ||
        field.description ||
        undefined,
      selector: field.selector as Selector | undefined,
      required: field.required && field.default === undefined,
      example: field.example,
      default: field.default,
    } satisfies YamlFieldSchema;
  };

  for (const [fieldName, field] of Object.entries(
    (serviceDef?.fields ?? {}) as Record<string, ServiceField>
  )) {
    // Fields that have a nested `fields` property are grouping containers
    // (e.g. `advanced_fields` with `collapsed: true`). Hoist their children
    // into the top-level data fields instead of treating the group itself
    // as a key.
    if (field.fields && typeof field.fields === "object") {
      for (const [subFieldName, subField] of Object.entries(field.fields)) {
        addField(subFieldName, subField);
      }
    } else {
      addField(fieldName, field);
    }
  }

  // Build target sub-field schemas, forwarding the service's target filter
  // (e.g. { entity: [{ domain: ["light"] }] }) into the entity_id selector
  // so completions are scoped to matching entities.
  const targetDef = serviceDef?.target as TargetSelector["target"] | undefined;

  return {
    ...ACTION_BASE_FIELDS,
    action: {
      description:
        "ui.panel.config.automation.editor.yaml_schema.actions.service.action",
      selector: { text: null },
      required: true,
    },
    target: buildTargetSchema(targetDef),
    data: {
      description:
        "ui.panel.config.automation.editor.yaml_schema.actions.service.data",
      fields: fieldSchemas,
      selector: { object: null },
    },
    response_variable: {
      description:
        "ui.panel.config.automation.editor.yaml_schema.actions.service.response_variable",
      selector: { text: null },
    },
  };
}

/** Keys that identify a built-in (non service call) action. */
const BUILT_IN_ACTION_KEYS = [
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
] as const;

/**
 * The discriminator that decides which YAML field schema an action gets: the
 * service name for service calls (`light.turn_on`), otherwise the built-in
 * action key (`delay`, `choose`, …).
 *
 * Only depends on the shape of the action, not on its values, so callers can
 * memoize `actionToYamlSchema` on it instead of on the action object — which
 * gets a new identity on every keystroke in the YAML editor.
 */
export function actionSchemaKey(action: Action): string | undefined {
  // Service/action calls have an "action" key holding "<domain>.<service>".
  const actionName = (action as { action?: unknown }).action;
  if (typeof actionName === "string") {
    return actionName;
  }
  return BUILT_IN_ACTION_KEYS.find((key) => key in action);
}

/**
 * Derive the YAML field schema for any action, combining built-in schemas
 * with service-call schemas from hass.services.
 *
 * Takes the key from `actionSchemaKey()` rather than the action itself so the
 * result is stable while the user edits the action's values.
 */
export function actionToYamlSchema(
  actionKey: string | undefined,
  services: HomeAssistant["services"],
  localize: HomeAssistant["localize"]
): YamlFieldSchemaMap | undefined {
  if (actionKey?.includes(".")) {
    const [domain, service] = actionKey.split(".", 2);
    if (domain && service) {
      return serviceActionSchema(domain, service, services, localize);
    }
  } else if (actionKey) {
    const schema = builtInActionSchema(actionKey);
    if (schema) {
      return schema;
    }
  }

  // Unknown — return base fields at minimum so hover/completions still work.
  return allowUnknownFields({ ...ACTION_BASE_FIELDS });
}
