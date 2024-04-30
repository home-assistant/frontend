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
  ClimateSwingModesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

type ClimateSwingModesCardFeatureData = ClimateSwingModesCardFeatureConfig & {
  customize_modes: boolean;
};

@customElement("hui-climate-swing-modes-card-feature-editor")
export class HuiClimateSwingModesCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: ClimateSwingModesCardFeatureConfig;

  public setConfig(config: ClimateSwingModesCardFeatureConfig): void {
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
                  `ui.panel.lovelace.editor.features.types.climate-swing-modes.style_list.${mode}`
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
                name: "swing_modes",
                selector: {
                  select: {
                    reorder: true,
                    multiple: true,
                    options:
                      stateObj?.attributes.swing_modes?.map((mode) => ({
                        value: mode,
                        label: formatEntityAttributeValue(
                          stateObj,
                          "swing_mode",
                          mode
                        ),
                      })) || [],
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

    const data: ClimateSwingModesCardFeatureData = {
      style: "dropdown",
      ...this._config,
      customize_modes: this._config.swing_modes !== undefined,
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
      .value as ClimateSwingModesCardFeatureData;

    const stateObj = this.context?.entity_id
      ? this.hass!.states[this.context?.entity_id]
      : undefined;

    if (customize_modes && !config.swing_modes) {
      config.swing_modes = stateObj?.attributes.swing_modes || [];
    }
    if (!customize_modes && config.swing_modes) {
      delete config.swing_modes;
    }

    fireEvent(this, "config-changed", { config: config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "style":
      case "swing_modes":
      case "customize_modes":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.features.types.climate-swing-modes.${schema.name}`
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-swing-modes-card-feature-editor": HuiClimateSwingModesCardFeatureEditor;
  }
}
