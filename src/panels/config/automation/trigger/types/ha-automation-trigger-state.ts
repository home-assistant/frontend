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
  refine,
  string,
  tuple,
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
import type { SchemaUnion } from "../../../../../components/ha-form/types";

const stateTriggerStruct = assign(
  baseTriggerStruct,
  object({
    alias: optional(string()),
    trigger: literal("state"),
    entity_id: optional(union([string(), array(string())])),
    attribute: optional(string()),
    from: optional(nullable(string())),
    not_from: optional(tuple([literal("unavailable"), literal("unknown")])),
    to: optional(nullable(string())),
    not_to: optional(tuple([literal("unavailable"), literal("unknown")])),
    for: optional(union([number(), string(), forDictStruct])),
  })
);

const ANY_STATE_VALUE = "__ANY_STATE_IGNORE_ATTRIBUTES__";
const ANY_KNOWN_STATE_VALUE = "__ANY_KNOWN_STATE__";

@customElement("ha-automation-trigger-state")
export class HaStateTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: StateTrigger;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): StateTrigger {
    return { trigger: "state", entity_id: [] };
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc, entityId, attribute) =>
      [
        {
          name: "entity_id",
          required: true,
          selector: { entity: { multiple: true } },
        },
        {
          name: "attribute",
          selector: {
            attribute: {
              entity_id: entityId ? entityId[0] : undefined,
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
          selector: {
            state: {
              extra_options: (attribute
                ? []
                : [
                    {
                      label: localize(
                        "ui.panel.config.automation.editor.triggers.type.state.any_state_ignore_attributes"
                      ),
                      value: ANY_STATE_VALUE,
                    },
                    {
                      label: localize(
                        "ui.panel.config.automation.editor.triggers.type.state.any_known_state"
                      ),
                      value: ANY_KNOWN_STATE_VALUE,
                    },
                  ]) as any,
              entity_id: entityId ? entityId[0] : undefined,
              attribute: attribute,
            },
          },
        },
        {
          name: "to",
          selector: {
            state: {
              extra_options: (attribute
                ? []
                : [
                    {
                      label: localize(
                        "ui.panel.config.automation.editor.triggers.type.state.any_state_ignore_attributes"
                      ),
                      value: ANY_STATE_VALUE,
                    },
                    {
                      label: localize(
                        "ui.panel.config.automation.editor.triggers.type.state.any_known_state"
                      ),
                      value: ANY_KNOWN_STATE_VALUE,
                    },
                  ]) as any,
              entity_id: entityId ? entityId[0] : undefined,
              attribute: attribute,
            },
          },
        },
        { name: "for", selector: { duration: {} } },
      ] as const
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
      assert(
        this.trigger,
        refine(
          stateTriggerStruct,
          "one each of: to/not_to, from/not_from",
          (value) => {
            if ("to" in value && "not_to" in value) {
              return "bad";
            }
            if ("from" in value && "not_from" in value) {
              return "bad";
            }
            return true;
          }
        )
      );
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
    if ("not_to" in data) {
      data.to = ANY_KNOWN_STATE_VALUE;
    }
    if ("not_from" in data) {
      data.from = ANY_KNOWN_STATE_VALUE;
    }
    const schema = this._schema(
      this.hass.localize,
      this.trigger.entity_id,
      this.trigger.attribute
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

    if (newTrigger.to === ANY_STATE_VALUE) {
      newTrigger.to = newTrigger.attribute ? undefined : null;
    }
    if (newTrigger.from === ANY_STATE_VALUE) {
      newTrigger.from = newTrigger.attribute ? undefined : null;
    }
    if (newTrigger.to === ANY_KNOWN_STATE_VALUE) {
      delete newTrigger.to;
      newTrigger.not_to = newTrigger.attribute
        ? undefined
        : ["unavailable", "unknown"];
    } else {
      delete newTrigger.not_to;
    }
    if (newTrigger.from === ANY_KNOWN_STATE_VALUE) {
      delete newTrigger.from;
      newTrigger.not_from = newTrigger.attribute
        ? undefined
        : ["unavailable", "unknown"];
    } else {
      delete newTrigger.not_from;
    }

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
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-state": HaStateTrigger;
  }
}
