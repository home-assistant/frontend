import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { createDurationData } from "../../../../../common/datetime/create_duration_data";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { hasTemplate } from "../../../../../common/string/has-template";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import type { NumericStateTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";

const SCHEMA = [
  {
    name: "entity_id",
    required: true,
    selector: { entity: { multiple: true } },
  },
  {
    name: "attribute",
    context: { filter_entity: "entity_id" },
    selector: {
      attribute: {
        hide_attributes: [
          "access_token",
          "auto_update",
          "available_modes",
          "away_mode",
          "changed_by",
          "code_arm_required",
          "code_format",
          "color_mode",
          "current_activity",
          "device_class",
          "editable",
          "effect_list",
          "effect",
          "entity_id",
          "entity_picture",
          "event_type",
          "event_types",
          "fan_mode",
          "fan_modes",
          "fan_speed_list",
          "forecast",
          "friendly_name",
          "frontend_stream_type",
          "has_date",
          "has_time",
          "hs_color",
          "hvac_mode",
          "hvac_modes",
          "icon",
          "id",
          "latest_version",
          "max_color_temp_kelvin",
          "max_mireds",
          "max_temp",
          "media_album_name",
          "media_artist",
          "media_content_type",
          "media_position_updated_at",
          "media_title",
          "min_color_temp_kelvin",
          "min_mireds",
          "min_temp",
          "mode",
          "next_dawn",
          "next_dusk",
          "next_midnight",
          "next_noon",
          "next_rising",
          "next_setting",
          "operation_list",
          "operation_mode",
          "options",
          "percentage_step",
          "precipitation_unit",
          "preset_mode",
          "preset_modes",
          "pressure_unit",
          "release_notes",
          "release_summary",
          "release_url",
          "restored",
          "rgb_color",
          "rgbw_color",
          "shuffle",
          "skipped_version",
          "sound_mode_list",
          "sound_mode",
          "source_list",
          "source_type",
          "source",
          "state_class",
          "step",
          "supported_color_modes",
          "supported_features",
          "swing_mode",
          "swing_modes",
          "target_temp_step",
          "temperature_unit",
          "title",
          "token",
          "unit_of_measurement",
          "user_id",
          "uuid",
          "visibility_unit",
          "wind_speed_unit",
          "xy_color",
        ],
      },
    },
  },
  {
    name: "above",
    selector: {
      choose: {
        translation_key:
          "ui.panel.config.automation.editor.triggers.type.numeric_state.threshold_type",
        choices: {
          value: {
            selector: {
              number: {
                mode: "box",
                min: Number.MIN_SAFE_INTEGER,
                max: Number.MAX_SAFE_INTEGER,
                step: 0.1,
              },
            },
          },
          input: {
            selector: {
              entity: { domain: ["input_number", "number", "sensor"] },
            },
          },
        },
      },
    },
  },
  {
    name: "below",
    selector: {
      choose: {
        translation_key:
          "ui.panel.config.automation.editor.triggers.type.numeric_state.threshold_type",
        choices: {
          value: {
            selector: {
              number: {
                mode: "box",
                min: Number.MIN_SAFE_INTEGER,
                max: Number.MAX_SAFE_INTEGER,
                step: 0.1,
              },
            },
          },
          input: {
            selector: {
              entity: { domain: ["input_number", "number", "sensor"] },
            },
          },
        },
      },
    },
  },
  {
    name: "value_template",
    selector: { template: {} },
  },
  {
    name: "for",
    selector: {
      choose: {
        translation_key:
          "ui.panel.config.automation.editor.triggers.type.numeric_state.for_type",
        choices: {
          duration: { selector: { duration: {} } },
          template: { selector: { template: {} } },
        },
      },
    },
  },
] as const;

@customElement("ha-automation-trigger-numeric_state")
export class HaNumericStateTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: NumericStateTrigger;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): NumericStateTrigger {
    return {
      trigger: "numeric_state",
      entity_id: [],
    };
  }

  private _wrapForValue(
    forValue: NumericStateTrigger["for"]
  ): Record<string, unknown> | undefined {
    if (forValue === undefined) {
      return undefined;
    }
    if (typeof forValue === "string" && hasTemplate(forValue)) {
      return { active_choice: "template", template: forValue };
    }
    return {
      active_choice: "duration",
      duration: createDurationData(forValue),
    };
  }

  private _unwrapForValue(
    forValue: Record<string, unknown> | undefined
  ): NumericStateTrigger["for"] {
    if (!forValue || !forValue.active_choice) {
      return forValue as NumericStateTrigger["for"];
    }
    if (forValue.active_choice === "template") {
      return forValue.template as string;
    }
    return forValue.duration as NumericStateTrigger["for"];
  }

  private _unwrapThresholdValue(
    value: Record<string, unknown> | number | string | undefined
  ): number | string | undefined {
    if (value === undefined || typeof value !== "object") {
      return value as number | string | undefined;
    }
    if (!value.active_choice) {
      return undefined;
    }
    return value[value.active_choice as string] as number | string | undefined;
  }

  private _data = memoizeOne((trigger: NumericStateTrigger) => ({
    ...trigger,
    entity_id: ensureArray(trigger.entity_id),
    for: this._wrapForValue(trigger.for),
  }));

  public render() {
    const data = this._data(this.trigger);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${SCHEMA}
        .disabled=${this.disabled}
        .localizeValue=${this.hass.localize}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newTrigger = { ...ev.detail.value };

    newTrigger.above = this._unwrapThresholdValue(newTrigger.above);
    newTrigger.below = this._unwrapThresholdValue(newTrigger.below);
    newTrigger.for = this._unwrapForValue(newTrigger.for);

    if (newTrigger.value_template === "") {
      delete newTrigger.value_template;
    }

    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<typeof SCHEMA>
  ): string => {
    switch (schema.name) {
      case "entity_id":
        return this.hass.localize("ui.components.entity.entity-picker.entity");
      case "attribute":
        return this.hass.localize(
          "ui.components.entity.entity-attribute-picker.attribute"
        );
      case "for":
        return this.hass.localize(
          `ui.panel.config.automation.editor.triggers.type.state.for`
        );
      default:
        return this.hass.localize(
          `ui.panel.config.automation.editor.triggers.type.numeric_state.${schema.name}`
        );
    }
  };

  static styles = css`
    :host {
      display: block;
      margin-bottom: var(--ha-space-3);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-numeric_state": HaNumericStateTrigger;
  }
}
