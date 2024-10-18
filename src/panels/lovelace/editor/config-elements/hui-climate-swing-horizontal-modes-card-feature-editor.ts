import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { FormatEntityAttributeValueFunc } from "../../../../common/translations/entity-state";
import { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import {
  ClimateSwingHorizontalModesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

type ClimateSwingHorizontalModesCardFeatureData =
  ClimateSwingHorizontalModesCardFeatureConfig & {
    customize_modes: boolean;
  };

@customElement("hui-climate-swing-horizontal-modes-card-feature-editor")
export class HuiClimateSwingHorizontalModesCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: ClimateSwingHorizontalModesCardFeatureConfig;

  public setConfig(config: ClimateSwingHorizontalModesCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      formatEntityAttributeValue: FormatEntityAttributeValueFunc,
      stateObj: HassEntity | undefined,
      customizeModes: boolean
    ) =>
      [
        {
          name: "style",
          selector: {
            select: {
              multiple: false,
              mode: "list",
              options: ["dropdown", "icons"].map((mode) => ({
                value: mode,
                label: localize(
                  `ui.panel.lovelace.editor.features.types.climate-swing-horizontal-modes.style_list.${mode}`
                ),
              })),
            },
          },
        },
        {
          name: "customize_modes",
          selector: {
            boolean: {},
          },
        },
        ...(customizeModes
          ? ([
              {
                name: "swing_horizontal_modes",
                selector: {
                  select: {
                    reorder: true,
                    multiple: true,
                    options:
                      stateObj?.attributes.swing_horizontal_modes?.map(
                        (mode) => ({
                          value: mode,
                          label: formatEntityAttributeValue(
                            stateObj,
                            "swing_horizontal_mode",
                            mode
                          ),
                        })
                      ) || [],
                  },
                },
              },
            ] as const satisfies readonly HaFormSchema[])
          : []),
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const stateObj = this.context?.entity_id
      ? this.hass.states[this.context?.entity_id]
      : undefined;

    const data: ClimateSwingHorizontalModesCardFeatureData = {
      style: "dropdown",
      ...this._config,
      customize_modes: this._config.swing_horizontal_modes !== undefined,
    };

    const schema = this._schema(
      this.hass.localize,
      this.hass.formatEntityAttributeValue,
      stateObj,
      data.customize_modes
    );

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
    const { customize_modes, ...config } = ev.detail
      .value as ClimateSwingHorizontalModesCardFeatureData;

    const stateObj = this.context?.entity_id
      ? this.hass!.states[this.context?.entity_id]
      : undefined;

    if (customize_modes && !config.swing_horizontal_modes) {
      config.swing_horizontal_modes =
        stateObj?.attributes.swing_horizontal_modes || [];
    }
    if (!customize_modes && config.swing_horizontal_modes) {
      delete config.swing_horizontal_modes;
    }

    fireEvent(this, "config-changed", { config: config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "style":
      case "swing_horizontal_modes":
      case "customize_modes":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.features.types.climate-swing-horizontal-modes.${schema.name}`
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-swing-horizontal-modes-card-feature-editor": HuiClimateSwingHorizontalModesCardFeatureEditor;
  }
}
