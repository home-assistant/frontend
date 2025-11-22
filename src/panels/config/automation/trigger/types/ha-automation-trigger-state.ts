import type { PropertyValues } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import {
  array,
  assert,
  assign,
  literal,
  nullable,
  number,
  object,
  optional,
  string,
  union,
} from "superstruct";
import memoizeOne from "memoize-one";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { hasTemplate } from "../../../../../common/string/has-template";
import type { StateTrigger } from "../../../../../data/automation";
import { ANY_STATE_VALUE } from "../../../../../components/entity/const";
import type { HomeAssistant } from "../../../../../types";
import { baseTriggerStruct, forDictStruct } from "../../structs";
import type { TriggerElement } from "../ha-automation-trigger-row";
import "../../../../../components/ha-form/ha-form";
import { createDurationData } from "../../../../../common/datetime/create_duration_data";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../../components/ha-form/types";

// Extended form data used only in the UI form. These fields do not exist on the
// persisted StateTrigger type, but are convenient for toggling between positive
// and negative matches in the editor.
type StateTriggerFormData = StateTrigger & {
  from_match?: "is" | "is_not";
  to_match?: "is" | "is_not";
};

const stateTriggerStruct = assign(
  baseTriggerStruct,
  object({
    alias: optional(string()),
    trigger: literal("state"),
    entity_id: optional(union([string(), array(string())])),
    attribute: optional(string()),
    from: optional(union([nullable(string()), array(string())])),
    to: optional(union([nullable(string()), array(string())])),
    not_from: optional(union([nullable(string()), array(string())])),
    not_to: optional(union([nullable(string()), array(string())])),
    for: optional(union([number(), string(), forDictStruct])),
  })
);

@customElement("ha-automation-trigger-state")
export class HaStateTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: StateTrigger;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): StateTrigger {
    return { trigger: "state", entity_id: [] };
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      attribute: string | undefined,
      hideInFrom: string[],
      hideInTo: string[]
    ) =>
      [
        {
          name: "entity_id",
          required: true,
          selector: { entity: { multiple: true } },
        },
        {
          name: "attribute",
          context: {
            filter_entity: "entity_id",
          },
          selector: {
            attribute: {
              hide_attributes: [
                "access_token",
                "available_modes",
                "code_arm_required",
                "code_format",
                "color_modes",
                "device_class",
                "editable",
                "effect_list",
                "entity_id",
                "entity_picture",
                "event_types",
                "fan_modes",
                "fan_speed_list",
                "friendly_name",
                "frontend_stream_type",
                "has_date",
                "has_time",
                "hvac_modes",
                "icon",
                "id",
                "max_color_temp_kelvin",
                "max_mireds",
                "max_temp",
                "max",
                "min_color_temp_kelvin",
                "min_mireds",
                "min_temp",
                "min",
                "mode",
                "operation_list",
                "options",
                "percentage_step",
                "precipitation_unit",
                "preset_modes",
                "pressure_unit",
                "sound_mode_list",
                "source_list",
                "state_class",
                "step",
                "supported_color_modes",
                "supported_features",
                "swing_modes",
                "target_temp_step",
                "temperature_unit",
                "token",
                "unit_of_measurement",
                "visibility_unit",
                "wind_speed_unit",
              ],
            },
          },
        },
        {
          name: "from_match",
          selector: {
            button_toggle: {
              options: [
                {
                  value: "is",
                  label: localize(
                    "ui.panel.config.automation.editor.triggers.type.state.is"
                  ),
                },
                {
                  value: "is_not",
                  label: localize(
                    "ui.panel.config.automation.editor.triggers.type.state.is_not"
                  ),
                },
              ],
            },
          },
        },
        {
          name: "from",
          context: {
            filter_entity: "entity_id",
          },
          selector: {
            state: {
              multiple: true,
              extra_options: (attribute
                ? []
                : [
                    {
                      label: localize(
                        "ui.panel.config.automation.editor.triggers.type.state.any_state_ignore_attributes"
                      ),
                      value: ANY_STATE_VALUE,
                    },
                  ]) as any,
              attribute: attribute,
              hide_states: hideInFrom,
            },
          },
        },
        {
          name: "to_match",
          selector: {
            button_toggle: {
              options: [
                {
                  value: "is",
                  label: localize(
                    "ui.panel.config.automation.editor.triggers.type.state.is"
                  ),
                },
                {
                  value: "is_not",
                  label: localize(
                    "ui.panel.config.automation.editor.triggers.type.state.is_not"
                  ),
                },
              ],
            },
          },
        },
        {
          name: "to",
          context: {
            filter_entity: "entity_id",
          },
          selector: {
            state: {
              multiple: true,
              extra_options: (attribute
                ? []
                : [
                    {
                      label: localize(
                        "ui.panel.config.automation.editor.triggers.type.state.any_state_ignore_attributes"
                      ),
                      value: ANY_STATE_VALUE,
                    },
                  ]) as any,
              attribute: attribute,
              hide_states: hideInTo,
            },
          },
        },
        { name: "for", selector: { duration: {} } },
      ] as const satisfies HaFormSchema[]
  );

  public shouldUpdate(changedProperties: PropertyValues) {
    if (!changedProperties.has("trigger")) {
      return true;
    }
    if (
      this.trigger.for &&
      typeof this.trigger.for === "object" &&
      this.trigger.for.milliseconds === 0
    ) {
      delete this.trigger.for.milliseconds;
    }
    // Check for templates in trigger. If found, revert to YAML mode.
    if (this.trigger && hasTemplate(this.trigger)) {
      fireEvent(
        this,
        "ui-mode-not-available",
        Error(this.hass.localize("ui.errors.config.no_template_editor_support"))
      );
      return false;
    }
    try {
      assert(this.trigger, stateTriggerStruct);
    } catch (e: any) {
      fireEvent(this, "ui-mode-not-available", e);
      return false;
    }
    return true;
  }

  protected render() {
    const trgFor = createDurationData(this.trigger.for);

    const data: StateTriggerFormData = {
      ...this.trigger,
      entity_id: ensureArray(this.trigger.entity_id),
      for: trgFor,
    };

    const hasNotFrom = this.trigger.not_from !== undefined;
    const hasNotTo = this.trigger.not_to !== undefined;
    data.from_match = hasNotFrom ? "is_not" : "is";
    data.to_match = hasNotTo ? "is_not" : "is";

    const fromSource = hasNotFrom ? this.trigger.not_from : this.trigger.from;
    const toSource = hasNotTo ? this.trigger.not_to : this.trigger.to;

    data.from = this._normalizeStates(fromSource, data.attribute);
    data.to = this._normalizeStates(toSource, data.attribute);
    const schema = this._schema(
      this.hass.localize,
      this.trigger.attribute,
      data.to,
      data.from
    );

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
        .disabled=${this.disabled}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newTrigger = ev.detail.value;
    const fromMatch = newTrigger.from_match === "is_not" ? "is_not" : "is";
    const toMatch = newTrigger.to_match === "is_not" ? "is_not" : "is";

    // Sanitize values based on match mode
    const sanitizedFrom = this._sanitizeForMatch(
      newTrigger.from,
      fromMatch,
      newTrigger.attribute
    );
    const sanitizedTo = this._sanitizeForMatch(
      newTrigger.to,
      toMatch,
      newTrigger.attribute
    );

    // Apply back to correct keys and clean up UI-only props
    delete newTrigger.from_match;
    delete newTrigger.to_match;

    this._applyMatchAssignment(newTrigger, "from", fromMatch, sanitizedFrom);
    this._applyMatchAssignment(newTrigger, "to", toMatch, sanitizedTo);

    Object.keys(newTrigger).forEach((key) => {
      const val = newTrigger[key];
      if (val === undefined || val === "") {
        delete newTrigger[key];
      }
    });

    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private _applyMatchAssignment(
    target: any,
    baseKey: "from" | "to",
    match: "is" | "is_not",
    value: string | string[] | null | undefined
  ): void {
    const negKey = `not_${baseKey}`;

    const hasValue = !(
      value === undefined ||
      (Array.isArray(value) && value.length === 0)
    );

    const setKey = match === "is_not" ? negKey : baseKey;
    const clearKey = match === "is_not" ? baseKey : negKey;

    // Always clear the opposite key first, then set (or clear) the target key
    delete target[clearKey];
    if (hasValue) {
      target[setKey] = value;
    } else {
      delete target[setKey];
    }
  }

  private _sanitizeForMatch(
    val: string | string[] | null | undefined,
    match: string,
    attribute?: string
  ): string | string[] | null | undefined {
    if (match === "is") {
      return this._applyAnyStateExclusive(val, attribute);
    }
    // is_not mode: if Any state selected and no attribute, map to null.
    if (Array.isArray(val)) {
      if (val.includes(ANY_STATE_VALUE)) {
        return attribute ? undefined : null;
      }
      const filtered = val.filter((v) => v !== ANY_STATE_VALUE);
      return filtered.length > 0 ? filtered : undefined;
    }
    if (val === ANY_STATE_VALUE) {
      return attribute ? undefined : null;
    }
    return val ?? undefined;
  }

  private _applyAnyStateExclusive(
    val: string | string[] | null | undefined,
    attribute?: string
  ): string | string[] | null | undefined {
    const anyStateSelected = Array.isArray(val)
      ? val.includes(ANY_STATE_VALUE)
      : val === ANY_STATE_VALUE;
    if (anyStateSelected) {
      // Any state is exclusive: null if no attribute, undefined if attribute
      return attribute ? undefined : null;
    }
    return val;
  }

  private _normalizeStates(
    value: string | string[] | null | undefined,
    attribute?: string
  ): string[] {
    // If no attribute is selected and backend value is null,
    // expose it as the special ANY state option in the UI.
    if (!attribute && value === null) {
      return [ANY_STATE_VALUE];
    }
    if (value === undefined || value === null) {
      return [];
    }
    return ensureArray(value);
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
      schema.name === "entity_id"
        ? "ui.components.entity.entity-picker.entity"
        : `ui.panel.config.automation.editor.triggers.type.state.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-state": HaStateTrigger;
  }
}
