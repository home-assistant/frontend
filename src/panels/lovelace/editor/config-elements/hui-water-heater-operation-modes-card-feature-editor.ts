import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { FormatEntityStateFunc } from "../../../../common/translations/entity-state";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type {
  WaterHeaterOperationModesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";
import { compareWaterHeaterOperationMode } from "../../../../data/water_heater";
import type { LocalizeFunc } from "../../../../common/translations/localize";

type WaterHeaterOperationModesCardFeatureData =
  WaterHeaterOperationModesCardFeatureConfig & {
    customize_modes: boolean;
  };

@customElement("hui-water-heater-operation-modes-card-feature-editor")
export class HuiWaterHeaterOperationModesCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: WaterHeaterOperationModesCardFeatureConfig;

  public setConfig(config: WaterHeaterOperationModesCardFeatureConfig): void {
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
                  `ui.panel.lovelace.editor.features.types.water-heater-operation-modes.style_list.${mode}`
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
                name: "operation_modes",
                selector: {
                  select: {
                    reorder: true,
                    multiple: true,
                    options: (stateObj?.attributes.operation_list || [])
                      .concat()
                      .sort(compareWaterHeaterOperationMode)
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

    const data: WaterHeaterOperationModesCardFeatureData = {
      style: "icons",
      ...this._config,
      customize_modes: this._config.operation_modes !== undefined,
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
      .value as WaterHeaterOperationModesCardFeatureData;

    const stateObj = this.context?.entity_id
      ? this.hass!.states[this.context?.entity_id]
      : undefined;

    if (customize_modes && !config.operation_modes) {
      config.operation_modes = (stateObj?.attributes.operation_list || [])
        .concat()
        .sort(compareWaterHeaterOperationMode);
    }
    if (!customize_modes && config.operation_modes) {
      delete config.operation_modes;
    }

    fireEvent(this, "config-changed", { config: config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "operation_modes":
      case "style":
      case "customize_modes":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.features.types.water-heater-operation-modes.${schema.name}`
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-water-heater-operation-modes-card-feature-editor": HuiWaterHeaterOperationModesCardFeatureEditor;
  }
}
