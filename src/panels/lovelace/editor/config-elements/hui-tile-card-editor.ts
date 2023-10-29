import { mdiGestureTap, mdiPalette } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  any,
  array,
  assert,
  assign,
  boolean,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { ensureArray } from "../../../../common/array/ensure-array";
import { HASSDomEvent, fireEvent } from "../../../../common/dom/fire_event";
import { formatEntityAttributeNameFunc } from "../../../../common/translations/entity-state";
import { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { TileCardConfig } from "../../cards/types";
import {
  LovelaceTileFeatureConfig,
  LovelaceTileFeatureContext,
} from "../../tile-features/types";
import type { LovelaceCardEditor } from "../../types";
import "../hui-sub-element-editor";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { EditSubElementEvent, SubElementEditorConfig } from "../types";
import { configElementStyle } from "./config-elements-style";
import "./hui-tile-card-features-editor";

const HIDDEN_ATTRIBUTES = [
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
];

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(string()),
    icon: optional(string()),
    hide_state: optional(boolean()),
    state_content: optional(union([string(), array(string())])),
    color: optional(string()),
    show_entity_picture: optional(boolean()),
    vertical: optional(boolean()),
    tap_action: optional(actionConfigStruct),
    icon_tap_action: optional(actionConfigStruct),
    features: optional(array(any())),
  })
);

@customElement("hui-tile-card-editor")
export class HuiTileCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: TileCardConfig;

  @state() private _subElementEditorConfig?: SubElementEditorConfig;

  public setConfig(config: TileCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      formatEntityAttributeName: formatEntityAttributeNameFunc,
      stateObj: HassEntity | undefined,
      hideState: boolean
    ) =>
      [
        { name: "entity", selector: { entity: {} } },
        {
          name: "",
          type: "expandable",
          iconPath: mdiPalette,
          title: localize(`ui.panel.lovelace.editor.card.tile.appearance`),
          schema: [
            {
              name: "",
              type: "grid",
              schema: [
                { name: "name", selector: { text: {} } },
                {
                  name: "icon",
                  selector: {
                    icon: {},
                  },
                  context: { icon_entity: "entity" },
                },
                {
                  name: "color",
                  selector: {
                    ui_color: {},
                  },
                },
                {
                  name: "show_entity_picture",
                  selector: {
                    boolean: {},
                  },
                },
                {
                  name: "vertical",
                  selector: {
                    boolean: {},
                  },
                },
                {
                  name: "hide_state",
                  selector: {
                    boolean: {},
                  },
                },
              ],
            },
            ...(!hideState
              ? ([
                  {
                    name: "state_content",
                    selector: {
                      select: {
                        mode: "dropdown",
                        reorder: true,
                        custom_value: true,
                        multiple: true,
                        options: [
                          {
                            label: localize(
                              `ui.panel.lovelace.editor.card.tile.state_content_options.state`
                            ),
                            value: "state",
                          },
                          {
                            label: localize(
                              `ui.panel.lovelace.editor.card.tile.state_content_options.last-changed`
                            ),
                            value: "last-changed",
                          },
                          ...Object.keys(stateObj?.attributes ?? {})
                            .filter((a) => !HIDDEN_ATTRIBUTES.includes(a))
                            .map((attribute) => ({
                              value: attribute,
                              label: formatEntityAttributeName(
                                stateObj!,
                                attribute
                              ),
                            })),
                        ],
                      },
                    },
                  },
                ] as const satisfies readonly HaFormSchema[])
              : []),
          ],
        },
        {
          name: "",
          type: "expandable",
          title: localize(`ui.panel.lovelace.editor.card.tile.actions`),
          iconPath: mdiGestureTap,
          schema: [
            {
              name: "tap_action",
              selector: {
                ui_action: {},
              },
            },
            {
              name: "icon_tap_action",
              selector: {
                ui_action: {},
              },
            },
          ],
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  private _context = memoizeOne(
    (entity_id?: string): LovelaceTileFeatureContext => ({ entity_id })
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity ?? ""] as
      | HassEntity
      | undefined;

    const schema = this._schema(
      this.hass!.localize,
      this.hass.formatEntityAttributeName,
      stateObj,
      this._config.hide_state ?? false
    );

    if (this._subElementEditorConfig) {
      return html`
        <hui-sub-element-editor
          .hass=${this.hass}
          .config=${this._subElementEditorConfig}
          .context=${this._context(this._config.entity)}
          @go-back=${this._goBack}
          @config-changed=${this.subElementChanged}
        >
        </hui-sub-element-editor>
      `;
    }

    const data = {
      ...this._config,
      state_content: ensureArray(this._config.state_content),
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <hui-tile-card-features-editor
        .hass=${this.hass}
        .stateObj=${stateObj}
        .features=${this._config!.features ?? []}
        @features-changed=${this._featuresChanged}
        @edit-detail-element=${this._editDetailElement}
      ></hui-tile-card-features-editor>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const newConfig = ev.detail.value as TileCardConfig;

    const config: TileCardConfig = {
      features: this._config.features,
      ...newConfig,
    };

    if (config.hide_state) {
      delete config.state_content;
    }

    if (config.state_content) {
      if (config.state_content.length === 0) {
        delete config.state_content;
      } else if (config.state_content.length === 1) {
        config.state_content = config.state_content[0];
      }
    }

    fireEvent(this, "config-changed", { config });
  }

  private _featuresChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const features = ev.detail.features as LovelaceTileFeatureConfig[];
    const config: TileCardConfig = {
      ...this._config,
      features,
    };

    if (features.length === 0) {
      delete config.features;
    }

    fireEvent(this, "config-changed", { config });
  }

  private subElementChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const value = ev.detail.config;

    const newConfigFeatures = this._config!.features
      ? [...this._config!.features]
      : [];

    if (!value) {
      newConfigFeatures.splice(this._subElementEditorConfig!.index!, 1);
      this._goBack();
    } else {
      newConfigFeatures[this._subElementEditorConfig!.index!] = value;
    }

    this._config = { ...this._config!, features: newConfigFeatures };

    this._subElementEditorConfig = {
      ...this._subElementEditorConfig!,
      elementConfig: value,
    };

    fireEvent(this, "config-changed", { config: this._config });
  }

  private _editDetailElement(ev: HASSDomEvent<EditSubElementEvent>): void {
    this._subElementEditorConfig = ev.detail.subElementConfig;
  }

  private _goBack(): void {
    this._subElementEditorConfig = undefined;
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "color":
      case "icon_tap_action":
      case "show_entity_picture":
      case "vertical":
      case "hide_state":
      case "state_content":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.tile.${schema.name}`
        );

      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  static get styles() {
    return [
      configElementStyle,
      css`
        .container {
          display: flex;
          flex-direction: column;
        }
        ha-form {
          display: block;
          margin-bottom: 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-tile-card-editor": HuiTileCardEditor;
  }
}
