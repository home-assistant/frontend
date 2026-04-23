import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { getEntityContext } from "../../../../common/entity/context/get_entity_context";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import {
  STATE_DISPLAY_SPECIAL_CONTENT,
  STATE_DISPLAY_SPECIAL_CONTENT_DOMAINS,
} from "../../../../state-display/state-display";
import type { HomeAssistant } from "../../../../types";
import type {
  LovelaceCardFeatureContext,
  StateCardFeatureConfig,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

const HIDDEN_ATTRIBUTES = [
  "access_token",
  "available_modes",
  "battery_icon",
  "battery_level",
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
  "remaining",
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
];

@customElement("hui-state-card-feature-editor")
export class HuiStateCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: StateCardFeatureConfig;

  public setConfig(config: StateCardFeatureConfig): void {
    this._config = config;
  }

  private _getOptions = memoizeOne(
    (hass: HomeAssistant, entityId: string | undefined) => {
      const stateObj = entityId ? hass.states[entityId] : undefined;
      const domain = entityId ? computeDomain(entityId) : undefined;

      const options: { value: string; label: string }[] = [
        {
          value: "state",
          label: hass.localize("ui.components.state-content-picker.state"),
        },
        {
          value: "last_changed",
          label: hass.localize(
            "ui.components.state-content-picker.last_changed"
          ),
        },
        {
          value: "last_updated",
          label: hass.localize(
            "ui.components.state-content-picker.last_updated"
          ),
        },
      ];

      if (stateObj) {
        const entityContext = getEntityContext(
          stateObj,
          hass.entities,
          hass.devices,
          hass.areas,
          hass.floors
        );
        if (entityContext.device) {
          options.push({
            value: "device_name",
            label: hass.localize(
              "ui.components.state-content-picker.device_name"
            ),
          });
        }
        if (entityContext.area) {
          options.push({
            value: "area_name",
            label: hass.localize(
              "ui.components.state-content-picker.area_name"
            ),
          });
        }
        if (entityContext.floor) {
          options.push({
            value: "floor_name",
            label: hass.localize(
              "ui.components.state-content-picker.floor_name"
            ),
          });
        }
      }

      if (domain) {
        STATE_DISPLAY_SPECIAL_CONTENT.filter((content) =>
          STATE_DISPLAY_SPECIAL_CONTENT_DOMAINS[domain]?.includes(content)
        ).forEach((content) => {
          options.push({
            value: content,
            label: hass.localize(
              `ui.components.state-content-picker.${content}`
            ),
          });
        });
      }

      if (stateObj) {
        Object.keys(stateObj.attributes)
          .filter((a) => !HIDDEN_ATTRIBUTES.includes(a))
          .forEach((attribute) => {
            options.push({
              value: attribute,
              label: hass.formatEntityAttributeName(stateObj, attribute),
            });
          });
      }

      return options;
    }
  );

  private _getSchema = memoizeOne(
    (options: { value: string; label: string }[]) =>
      [
        {
          name: "state_content",
          selector: {
            select: {
              mode: "dropdown",
              options,
            },
          },
        },
      ] as const satisfies HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const options = this._getOptions(this.hass, this.context?.entity_id);
    const schema = this._getSchema(options);

    // Normalize array to first value for display
    const value = Array.isArray(this._config.state_content)
      ? this._config.state_content[0]
      : this._config.state_content;

    const data = { ...this._config, state_content: value };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const config = ev.detail.value as StateCardFeatureConfig;
    if (!config.state_content) {
      delete config.state_content;
    }
    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._getSchema>>
  ) => {
    switch (schema.name) {
      case "state_content":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.tile.state_content"
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-card-feature-editor": HuiStateCardFeatureEditor;
  }
}
