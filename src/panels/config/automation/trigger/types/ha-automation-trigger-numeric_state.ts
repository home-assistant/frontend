import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { createDurationData } from "../../../../../common/datetime/create_duration_data";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { hasTemplate } from "../../../../../common/string/has-template";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import type { NumericStateTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";

@customElement("ha-automation-trigger-numeric_state")
export class HaNumericStateTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: NumericStateTrigger;

  @property({ type: Boolean }) public disabled = false;

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      entityId,
      inputAboveIsEntity?: boolean,
      inputBelowIsEntity?: boolean
    ) =>
      [
        { name: "entity_id", required: true, selector: { entity: {} } },
        {
          name: "attribute",
          selector: {
            attribute: {
              entity_id: entityId,
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
        },
        {
          name: "mode_above",
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

        {
          name: "above",
          selector: inputAboveIsEntity
            ? { entity: { domain: ["input_number", "number", "sensor"] } }
            : {
                number: {
                  mode: "box",
                  min: Number.MIN_SAFE_INTEGER,
                  max: Number.MAX_SAFE_INTEGER,
                  step: 0.1,
                },
              },
        },
        {
          name: "mode_below",
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
        {
          name: "below",
          selector: inputBelowIsEntity
            ? { entity: { domain: ["input_number", "number", "sensor"] } }
            : {
                number: {
                  mode: "box",
                  min: Number.MIN_SAFE_INTEGER,
                  max: Number.MAX_SAFE_INTEGER,
                  step: 0.1,
                },
              },
        },
        {
          name: "value_template",
          selector: { template: {} },
        },
        { name: "for", selector: { duration: {} } },
      ] as const
  );

  public willUpdate(changedProperties: PropertyValues) {
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

  public static get defaultConfig() {
    return {
      entity_id: "",
    };
  }

  public render() {
    const trgFor = createDurationData(this.trigger.for);

    const inputAboveIsEntity =
      this._inputAboveIsEntity ??
      (typeof this.trigger.above === "string" &&
        (this.trigger.above?.startsWith("input_number.") ||
          this.trigger.above?.startsWith("number.") ||
          this.trigger.above?.startsWith("sensor.")));
    const inputBelowIsEntity =
      this._inputBelowIsEntity ??
      (typeof this.trigger.below === "string" &&
        (this.trigger.below?.startsWith("input_number.") ||
          this.trigger.below?.startsWith("number.") ||
          this.trigger.below?.startsWith("sensor.")));

    const schema = this._schema(
      this.hass.localize,
      this.trigger.entity_id,
      inputAboveIsEntity,
      inputBelowIsEntity
    );

    const data = {
      mode_above: inputAboveIsEntity ? "input" : "value",
      mode_below: inputBelowIsEntity ? "input" : "value",
      ...this.trigger,
      for: trgFor,
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
    const newTrigger = ev.detail.value;

    this._inputAboveIsEntity = newTrigger.mode_above === "input";
    this._inputBelowIsEntity = newTrigger.mode_below === "input";

    delete newTrigger.mode_above;
    delete newTrigger.mode_below;

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
