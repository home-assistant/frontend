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
import type { HomeAssistant } from "../../../../../types";
import { baseTriggerStruct, forDictStruct } from "../../structs";
import type { TriggerElement } from "../ha-automation-trigger-row";
import "../../../../../components/ha-form/ha-form";
import { createDurationData } from "../../../../../common/datetime/create_duration_data";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../../components/ha-form/types";

const stateTriggerStruct = assign(
  baseTriggerStruct,
  object({
    alias: optional(string()),
    trigger: literal("state"),
    entity_id: optional(union([string(), array(string())])),
    attribute: optional(string()),
    from: optional(union([array(string()), nullable(string())])),
    to: optional(union([array(string()), nullable(string())])),
    for: optional(union([number(), string(), forDictStruct])),
  })
);

const ANY_STATE_VALUE = "__ANY_STATE_IGNORE_ATTRIBUTES__";

@customElement("ha-automation-trigger-state")
export class HaStateTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: StateTrigger;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): StateTrigger {
    return { trigger: "state", entity_id: "" };
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      attribute,
      fromSelected?: string[],
      toSelected?: string[]
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
          name: "from",
          context: {
            filter_entity: "entity_id",
          },
          selector: {
            state: {
              multiple: true,
              extra_options: attribute
                ? []
                : ([
                    {
                      label: localize(
                        "ui.panel.config.automation.editor.triggers.type.state.any_state_ignore_attributes"
                      ),
                      value: ANY_STATE_VALUE,
                      exclusive: true,
                    },
                  ] as any),
              attribute: attribute,
              hide_states: (toSelected || []).filter(
                (v) => v !== ANY_STATE_VALUE
              ),
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
              extra_options: attribute
                ? []
                : ([
                    {
                      label: localize(
                        "ui.panel.config.automation.editor.triggers.type.state.any_state_ignore_attributes"
                      ),
                      value: ANY_STATE_VALUE,
                      exclusive: true,
                    },
                  ] as any),
              attribute: attribute,
              hide_states: (fromSelected || []).filter(
                (v) => v !== ANY_STATE_VALUE
              ),
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

    const data = {
      ...this.trigger,
      entity_id: ensureArray(this.trigger.entity_id),
      for: trgFor,
    };
    if (!data.attribute && data.to === null) {
      data.to = ANY_STATE_VALUE;
    }
    if (!data.attribute && data.from === null) {
      data.from = ANY_STATE_VALUE;
    }
    const fromSelected = Array.isArray(this.trigger.from)
      ? this.trigger.from
      : typeof this.trigger.from === "string"
        ? [this.trigger.from]
        : [];
    const toSelected = Array.isArray(this.trigger.to)
      ? this.trigger.to
      : typeof this.trigger.to === "string"
        ? [this.trigger.to]
        : [];

    const schema = this._schema(
      this.hass.localize,
      this.trigger.attribute,
      fromSelected,
      toSelected
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

    newTrigger.to = this._normalizeBoundary(
      newTrigger.to,
      newTrigger.attribute
    );
    newTrigger.from = this._normalizeBoundary(
      newTrigger.from,
      newTrigger.attribute
    );
    this._removeOverlap(newTrigger);

    Object.keys(newTrigger).forEach((key) =>
      newTrigger[key] === undefined || newTrigger[key] === ""
        ? delete newTrigger[key]
        : {}
    );

    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
      schema.name === "entity_id"
        ? "ui.components.entity.entity-picker.entity"
        : `ui.panel.config.automation.editor.triggers.type.state.${schema.name}`
    );

  private _normalizeBoundary(
    value: string | string[] | null | undefined,
    attribute?: string
  ): string | string[] | null | undefined {
    if (Array.isArray(value)) {
      if (value.includes(ANY_STATE_VALUE)) {
        return attribute ? undefined : null;
      }
      return value.length === 0 ? undefined : value;
    }
    if (value === ANY_STATE_VALUE) {
      return attribute ? undefined : null;
    }
    return value;
  }

  private _removeOverlap(newTrigger: any) {
    const fromVals = this._asArray(newTrigger.from);
    const toVals = this._asArray(newTrigger.to);
    if (!fromVals.length || !toVals.length) return;

    const fromSet = new Set<string>(
      fromVals.filter((v) => v !== ANY_STATE_VALUE)
    );
    const toSet = new Set<string>(toVals.filter((v) => v !== ANY_STATE_VALUE));

    const filteredTo = toVals.filter((v) => !fromSet.has(v));
    const filteredFrom = fromVals.filter((v) => !toSet.has(v));

    newTrigger.to = filteredTo.length ? filteredTo : undefined;
    newTrigger.from = filteredFrom.length ? filteredFrom : undefined;
  }

  private _asArray(val: string | string[] | null | undefined): string[] {
    return Array.isArray(val) ? val : typeof val === "string" ? [val] : [];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-state": HaStateTrigger;
  }
}
