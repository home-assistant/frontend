import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import { NumericStateCondition } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";

@customElement("ha-automation-condition-numeric_state")
export default class HaNumericStateCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: NumericStateCondition;

  @property({ type: Boolean }) public disabled = false;

  @state() private _inputAboveIsEntity?: boolean;

  @state() private _inputBelowIsEntity?: boolean;

  public static get defaultConfig() {
    return {
      entity_id: "",
    };
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      inputAboveIsEntity?: boolean,
      inputBelowIsEntity?: boolean
    ) =>
      [
        { name: "entity_id", required: true, selector: { entity: {} } },
        {
          name: "attribute",
          selector: {
            attribute: {
              hide_attributes: [
                "access_token",
                "auto_update",
                "available_modes",
                "away_mode",
                "changed_by",
                "code_format",
                "color_modes",
                "current_activity",
                "device_class",
                "editable",
                "effect_list",
                "effect",
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
                "media_album_name",
                "media_artist",
                "media_content_type",
                "media_position_updated_at",
                "media_title",
                "next_dawn",
                "next_dusk",
                "next_midnight",
                "next_noon",
                "next_rising",
                "next_setting",
                "operation_list",
                "operation_mode",
                "options",
                "preset_mode",
                "preset_modes",
                "release_notes",
                "release_summary",
                "release_url",
                "restored",
                "rgb_color",
                "rgbw_color",
                "shuffle",
                "sound_mode_list",
                "sound_mode",
                "source_list",
                "source_type",
                "source",
                "state_class",
                "supported_features",
                "swing_mode",
                "swing_mode",
                "swing_modes",
                "title",
                "token",
                "unit_of_measurement",
                "xy_color",
              ],
            },
          },
          context: {
            filter_entity: "entity_id",
          },
        },
        {
          name: "mode_above",
          type: "select",
          required: true,
          options: [
            [
              "value",
              localize(
                "ui.panel.config.automation.editor.conditions.type.numeric_state.type_value"
              ),
            ],
            [
              "input",
              localize(
                "ui.panel.config.automation.editor.conditions.type.numeric_state.type_input"
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
          name: "mode_below",
          type: "select",
          required: true,
          options: [
            [
              "value",
              localize(
                "ui.panel.config.automation.editor.conditions.type.numeric_state.type_value"
              ),
            ],
            [
              "input",
              localize(
                "ui.panel.config.automation.editor.conditions.type.numeric_state.type_input"
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
            ] as const)
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
      ] as const
  );

  public render() {
    const inputAboveIsEntity =
      this._inputAboveIsEntity ??
      (typeof this.condition.above === "string" &&
        ((this.condition.above as string).startsWith("input_number.") ||
          (this.condition.above as string).startsWith("number.") ||
          (this.condition.above as string).startsWith("sensor.")));
    const inputBelowIsEntity =
      this._inputBelowIsEntity ??
      (typeof this.condition.below === "string" &&
        ((this.condition.below as string).startsWith("input_number.") ||
          (this.condition.below as string).startsWith("number.") ||
          (this.condition.below as string).startsWith("sensor.")));

    const schema = this._schema(
      this.hass.localize,
      inputAboveIsEntity,
      inputBelowIsEntity
    );

    const data = {
      mode_above: inputAboveIsEntity ? "input" : "value",
      mode_below: inputBelowIsEntity ? "input" : "value",
      ...this.condition,
    };

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
    const newCondition = ev.detail.value;

    this._inputAboveIsEntity = newCondition.mode_above === "input";
    this._inputBelowIsEntity = newCondition.mode_below === "input";

    delete newCondition.mode_above;
    delete newCondition.mode_below;

    if (newCondition.value_template === "") {
      delete newCondition.value_template;
    }

    fireEvent(this, "value-changed", { value: newCondition });
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
      default:
        return this.hass.localize(
          `ui.panel.config.automation.editor.triggers.type.numeric_state.${schema.name}`
        );
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-numeric_state": HaNumericStateCondition;
  }
}
