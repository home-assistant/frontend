import type { PropertyValues } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { createDurationData } from "../../../../../common/datetime/create_duration_data";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { hasTemplate } from "../../../../../common/string/has-template";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import type { NumericStateTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import { ensureArray } from "../../../../../common/array/ensure-array";

@customElement("ha-automation-trigger-numeric_state")
export class HaNumericStateTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: NumericStateTrigger;

  @property({ type: Boolean }) public disabled = false;

  @state() private _inputAboveIsEntity?: boolean;

  @state() private _inputBelowIsEntity?: boolean;

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      entityId: string | string[],
      inputAboveIsEntity?: boolean,
      inputBelowIsEntity?: boolean
    ) =>
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
                "auto_update",
                "available_modes",
                "away_mode",
                "changed_by",
                "code_arm_required",
                "code_format",
                "color_mode",
                "color_modes",
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
          name: "lower_limit",
          type: "select",
          required: true,
          options: [
            [
              "value",
              localize(
                "ui.panel.config.automation.editor.triggers.type.numeric_state.type_value"
              ),
            ],
            [
              "input",
              localize(
                "ui.panel.config.automation.editor.triggers.type.numeric_state.type_input"
              ),
            ],
          ],
        },
        ...(inputAboveIsEntity
          ? ([
              {
                name: "above",
                selector: {
                  entity: { domain: ["input_number", "number", "sensor"] },
                },
              },
            ] as const)
          : ([
              {
                name: "above",
                selector: {
                  number: {
                    mode: "box",
                    min: Number.MIN_SAFE_INTEGER,
                    max: Number.MAX_SAFE_INTEGER,
                    step: 0.1,
                  },
                },
              },
            ] as const)),
        {
          name: "upper_limit",
          type: "select",
          required: true,
          options: [
            [
              "value",
              localize(
                "ui.panel.config.automation.editor.triggers.type.numeric_state.type_value"
              ),
            ],
            [
              "input",
              localize(
                "ui.panel.config.automation.editor.triggers.type.numeric_state.type_input"
              ),
            ],
          ],
        },
        ...(inputBelowIsEntity
          ? ([
              {
                name: "below",
                selector: {
                  entity: { domain: ["input_number", "number", "sensor"] },
                },
              },
            ] as const satisfies HaFormSchema[])
          : ([
              {
                name: "below",
                selector: {
                  number: {
                    mode: "box",
                    min: Number.MIN_SAFE_INTEGER,
                    max: Number.MAX_SAFE_INTEGER,
                    step: 0.1,
                  },
                },
              },
            ] as const)),
        {
          name: "value_template",
          selector: { template: {} },
        },
        { name: "for", selector: { duration: {} } },
      ] as const
  );

  public willUpdate(changedProperties: PropertyValues) {
    this._inputAboveIsEntity =
      this._inputAboveIsEntity ??
      (typeof this.trigger.above === "string" &&
        ((this.trigger.above as string).startsWith("input_number.") ||
          (this.trigger.above as string).startsWith("number.") ||
          (this.trigger.above as string).startsWith("sensor.")));
    this._inputBelowIsEntity =
      this._inputBelowIsEntity ??
      (typeof this.trigger.below === "string" &&
        ((this.trigger.below as string).startsWith("input_number.") ||
          (this.trigger.below as string).startsWith("number.") ||
          (this.trigger.below as string).startsWith("sensor.")));

    if (!changedProperties.has("trigger")) {
      return;
    }
    // Check for templates in trigger. If found, revert to YAML mode.
    if (this.trigger && hasTemplate(this.trigger.for)) {
      fireEvent(
        this,
        "ui-mode-not-available",
        Error(this.hass.localize("ui.errors.config.no_template_editor_support"))
      );
    }
  }

  public static get defaultConfig(): NumericStateTrigger {
    return {
      trigger: "numeric_state",
      entity_id: [],
    };
  }

  private _data = memoizeOne(
    (
      inputAboveIsEntity: boolean,
      inputBelowIsEntity: boolean,
      trigger: NumericStateTrigger
    ) => ({
      lower_limit: inputAboveIsEntity ? "input" : "value",
      upper_limit: inputBelowIsEntity ? "input" : "value",
      ...trigger,
      entity_id: ensureArray(trigger.entity_id),
      for: createDurationData(trigger.for),
    })
  );

  public render() {
    const schema = this._schema(
      this.hass.localize,
      this.trigger.entity_id,
      this._inputAboveIsEntity,
      this._inputBelowIsEntity
    );

    const data = this._data(
      this._inputAboveIsEntity!,
      this._inputBelowIsEntity!,
      this.trigger
    );

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newTrigger = { ...ev.detail.value };

    this._inputAboveIsEntity = newTrigger.lower_limit === "input";
    this._inputBelowIsEntity = newTrigger.upper_limit === "input";

    delete newTrigger.lower_limit;
    delete newTrigger.upper_limit;

    if (newTrigger.value_template === "") {
      delete newTrigger.value_template;
    }

    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
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
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-numeric_state": HaNumericStateTrigger;
  }
}
