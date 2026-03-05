import { mdiWaterBoiler } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-attribute-icon";
import "../../../components/ha-control-select";
import "../../../components/ha-control-select-menu";
import "../../../components/ha-list-item";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type {
  OperationMode,
  WaterHeaterEntity,
} from "../../../data/water_heater";
import { compareWaterHeaterOperationMode } from "../../../data/water_heater";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import { filterModes } from "./common/filter-modes";
import type {
  LovelaceCardFeatureContext,
  WaterHeaterOperationModesCardFeatureConfig,
} from "./types";

export const supportsWaterHeaterOperationModesCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return domain === "water_heater";
};

@customElement("hui-water-heater-operation-modes-card-feature")
class HuiWaterHeaterOperationModeCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: WaterHeaterOperationModesCardFeatureConfig;

  @state() _currentOperationMode?: OperationMode;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as
      | WaterHeaterEntity
      | undefined;
  }

  static getStubConfig(): WaterHeaterOperationModesCardFeatureConfig {
    return {
      type: "water-heater-operation-modes",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-water-heater-operation-modes-card-feature-editor");
    return document.createElement(
      "hui-water-heater-operation-modes-card-feature-editor"
    );
  }

  public setConfig(config: WaterHeaterOperationModesCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (
      (changedProp.has("hass") || changedProp.has("context")) &&
      this._stateObj
    ) {
      const oldHass = changedProp.get("hass") as HomeAssistant | undefined;
      const oldStateObj = oldHass?.states[this.context!.entity_id!];
      if (oldStateObj !== this._stateObj) {
        this._currentOperationMode = this._stateObj.state as OperationMode;
      }
    }
  }

  private async _valueChanged(
    ev: CustomEvent<{ value?: string; item?: { value: string } }>
  ) {
    const mode = ev.detail.value ?? ev.detail.item?.value;

    if (mode === this._stateObj!.state || !mode) {
      return;
    }

    const oldMode = this._stateObj!.state as OperationMode;
    this._currentOperationMode = mode as OperationMode;

    try {
      await this._setMode(this._currentOperationMode);
    } catch (_err) {
      this._currentOperationMode = oldMode;
    }
  }

  private async _setMode(mode: OperationMode) {
    await this.hass!.callService("water_heater", "set_operation_mode", {
      entity_id: this._stateObj!.entity_id,
      operation_mode: mode,
    });
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsWaterHeaterOperationModesCardFeature(this.hass, this.context)
    ) {
      return null;
    }

    const color = stateColorCss(this._stateObj);

    const orderedModes = (this._stateObj.attributes.operation_list || [])
      .concat()
      .sort(compareWaterHeaterOperationMode)
      .reverse();

    const options = filterModes(orderedModes, this._config.operation_modes).map(
      (mode) => ({
        value: mode,
        label: this.hass!.formatEntityState(this._stateObj!, mode),
      })
    );

    if (this._config.style === "dropdown") {
      return html`
        <ha-control-select-menu
          .hass=${this.hass}
          show-arrow
          hide-label
          .label=${this.hass.localize("ui.card.water_heater.mode")}
          .value=${this._currentOperationMode}
          .disabled=${this._stateObj.state === UNAVAILABLE}
          @wa-select=${this._valueChanged}
          .options=${options.map((option) => ({
            ...option,
            attributeIcon: {
              stateObj: this._stateObj,
              attribute: "operation_mode",
              attributeValue: option.value,
            },
          }))}
        >
          <ha-svg-icon slot="icon" .path=${mdiWaterBoiler}></ha-svg-icon>
        </ha-control-select-menu>
      `;
    }

    return html`
      <ha-control-select
        .options=${options.map((option) => ({
          ...option,
          icon: html`
            <ha-attribute-icon
              slot="graphic"
              .hass=${this.hass}
              .stateObj=${this._stateObj}
              attribute="operation_mode"
              .attributeValue=${option.value}
            ></ha-attribute-icon>
          `,
        }))}
        .value=${this._currentOperationMode}
        @value-changed=${this._valueChanged}
        hide-option-label
        .label=${this.hass.localize("ui.card.water_heater.mode")}
        style=${styleMap({
          "--control-select-color": color,
        })}
        .disabled=${this._stateObj!.state === UNAVAILABLE}
      >
      </ha-control-select>
    `;
  }

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-water-heater-operation-modes-card-feature": HuiWaterHeaterOperationModeCardFeature;
  }
}
