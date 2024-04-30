import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { FormatEntityStateFunc } from "../../../../common/translations/entity-state";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import { compareClimateHvacModes } from "../../../../data/climate";
import type { HomeAssistant } from "../../../../types";
import {
  ClimateHvacModesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

type ClimateHvacModesCardFeatureData = ClimateHvacModesCardFeatureConfig & {
  customize_modes: boolean;
};

@customElement("hui-climate-hvac-modes-card-feature-editor")
export class HuiClimateHvacModesCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: ClimateHvacModesCardFeatureConfig;

  public setConfig(config: ClimateHvacModesCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      formatEntityState: FormatEntityStateFunc,
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
                  `ui.panel.lovelace.editor.features.types.climate-preset-modes.style_list.${mode}`
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
                name: "hvac_modes",
                selector: {
                  select: {
                    reorder: true,
                    multiple: true,
                    options: (stateObj?.attributes.hvac_modes || [])
                      .concat()
                      .sort(compareClimateHvacModes)
                      .map((mode) => ({
                        value: mode,
                        label: stateObj
                          ? formatEntityState(stateObj, mode)
                          : mode,
                      })),
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

    const data: ClimateHvacModesCardFeatureData = {
      style: "icons",
      ...this._config,
      customize_modes: this._config.hvac_modes !== undefined,
    };

    const schema = this._schema(
      this.hass.localize,
      this.hass.formatEntityState,
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
      .value as ClimateHvacModesCardFeatureData;

    const stateObj = this.context?.entity_id
      ? this.hass!.states[this.context?.entity_id]
      : undefined;

    if (customize_modes && !config.hvac_modes) {
      const ordererHvacModes = (stateObj?.attributes.hvac_modes || [])
        .concat()
        .sort(compareClimateHvacModes);
      config.hvac_modes = ordererHvacModes;
    }
    if (!customize_modes && config.hvac_modes) {
      delete config.hvac_modes;
    }

    fireEvent(this, "config-changed", { config: config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "hvac_modes":
      case "style":
      case "customize_modes":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.features.types.climate-hvac-modes.${schema.name}`
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-hvac-modes-card-feature-editor": HuiClimateHvacModesCardFeatureEditor;
  }
}
