import { html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  array,
  assert,
  assign,
  boolean,
  literal,
  number,
  object,
  optional,
  string,
  union,
} from "superstruct";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { hasTemplate } from "../../../../../common/string/has-template";
import { StateTrigger } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import { baseTriggerStruct, forDictStruct } from "../../structs";
import { TriggerElement } from "../ha-automation-trigger-row";
import "../../../../../components/ha-form/ha-form";
import { createDurationData } from "../../../../../common/datetime/create_duration_data";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import type { LocalizeFunc } from "../../../../../common/translations/localize";

const stateTriggerStruct = assign(
  baseTriggerStruct,
  object({
    alias: optional(string()),
    platform: literal("state"),
    entity_id: optional(union([string(), array(string())])),
    attribute: optional(string()),
    from: optional(string()),
    to: optional(string()),
    for: optional(union([number(), string(), forDictStruct])),
  })
);

const attributeTriggerStruct = assign(
  baseTriggerStruct,
  object({
    alias: optional(string()),
    platform: literal("state"),
    entity_id: optional(union([string(), array(string())])),
    attribute: optional(string()),
    from: optional(union([string(), number(), boolean()])),
    to: optional(union([string(), number(), boolean()])),
    for: optional(union([number(), string(), forDictStruct])),
  })
);

@customElement("ha-automation-trigger-state")
export class HaStateTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: StateTrigger;

  @property({ type: Boolean }) public disabled = false;

  @state() numericMode = false;

  public static get defaultConfig() {
    return { entity_id: [] };
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc, entityId, attribute, attributeTypeEnable) =>
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
        ...(attribute
          ? [
              {
                name: "attribute_type",
                selector: {
                  select: {
                    required: true,
                    options: [
                      {
                        value: "string",
                        label: localize(
                          "ui.panel.config.automation.editor.triggers.type.state.attribute_type_string"
                        ),
                      },
                      {
                        value: "number_boolean",
                        label: localize(
                          "ui.panel.config.automation.editor.triggers.type.state.attribute_type_number_boolean"
                        ),
                        disabled: !attributeTypeEnable,
                      },
                    ],
                  },
                },
              },
            ]
          : []),
        {
          name: "from",
          selector: {
            state: {
              entity_id: entityId ? entityId[0] : undefined,
              attribute: attribute,
            },
          },
        },
        {
          name: "to",
          selector: {
            state: {
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

    if (
      this.trigger.attribute &&
      this.trigger.to !== undefined &&
      this.trigger.from !== undefined &&
      typeof this.trigger.to !== typeof this.trigger.from
    ) {
      fireEvent(
        this,
        "ui-mode-not-available",
        Error(
          this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.state.ui_error_attribute_type_mismatch"
          )
        )
      );
      return false;
    }

    try {
      if (this.trigger.attribute) {
        assert(this.trigger, attributeTriggerStruct);
      } else {
        assert(this.trigger, stateTriggerStruct);
      }
    } catch (e: any) {
      fireEvent(this, "ui-mode-not-available", e);
      return false;
    }
    return true;
  }

  private isBooleanOrNumeric(value): boolean {
    return (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === undefined
    );
  }

  private maybeBooleanOrNumeric(value): boolean {
    if (this.isBooleanOrNumeric(value)) {
      return true;
    }
    if (typeof value === "string") {
      value = value.toLowerCase();
      return (
        !isNaN(value) ||
        value === "on" ||
        value === "off" ||
        value === "true" ||
        value === "false" ||
        value === "yes" ||
        value === "no"
      );
    }
    return false;
  }

  private stringToBoolean(value: string): boolean {
    value = value.toLowerCase();
    return value === "yes" || value === "on" || value === "true";
  }

  private booleanToString(value: boolean): string {
    return value ? "true" : "false";
  }

  protected render() {
    const trgFor = createDurationData(this.trigger.for);
    const numeric =
      this.trigger.to === undefined && this.trigger.from === undefined
        ? this.numericMode
        : this.isBooleanOrNumeric(this.trigger.from) &&
          this.isBooleanOrNumeric(this.trigger.to);
    this.numericMode = numeric;
    const maybeNumeric =
      this.maybeBooleanOrNumeric(this.trigger.from) &&
      this.maybeBooleanOrNumeric(this.trigger.to);

    const data = {
      ...this.trigger,
      entity_id: ensureArray(this.trigger.entity_id),
      for: trgFor,
      attribute_type: numeric ? "number_boolean" : "string",
    };

    data.from =
      data.from === false ? "false" : data.from === 0 ? "0" : data.from;
    data.to = data.to === false ? "false" : data.to === 0 ? "0" : data.to;

    const schema = this._schema(
      this.hass.localize,
      this.trigger.entity_id,
      this.trigger.attribute,
      maybeNumeric
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

    Object.keys(newTrigger).forEach((key) =>
      newTrigger[key] === undefined || newTrigger[key] === ""
        ? delete newTrigger[key]
        : {}
    );

    if (
      newTrigger.attribute &&
      newTrigger.attribute_type === "number_boolean" &&
      this.maybeBooleanOrNumeric(newTrigger.from) &&
      this.maybeBooleanOrNumeric(newTrigger.to)
    ) {
      this.numericMode = true;
      if (typeof newTrigger.from === "string") {
        if (!isNaN(newTrigger.from)) {
          newTrigger.from = Number(newTrigger.from);
        } else {
          newTrigger.from = this.stringToBoolean(newTrigger.from);
        }
      }
      if (typeof newTrigger.to === "string") {
        if (!isNaN(newTrigger.to)) {
          newTrigger.to = Number(newTrigger.to);
        } else {
          newTrigger.to = this.stringToBoolean(newTrigger.to);
        }
      }
    } else {
      this.numericMode = false;
      if (typeof newTrigger.from === "boolean") {
        newTrigger.from = this.booleanToString(newTrigger.from);
      }
      if (typeof newTrigger.to === "boolean") {
        newTrigger.to = this.booleanToString(newTrigger.to);
      }
      if (typeof newTrigger.from === "number") {
        newTrigger.from = newTrigger.from.toString();
      }
      if (typeof newTrigger.to === "number") {
        newTrigger.to = newTrigger.to.toString();
      }
    }

    delete newTrigger.attribute_type;

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
