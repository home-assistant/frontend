import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import "../../../components/ha-control-slider";
import { UNAVAILABLE } from "../../../data/entity";
import type {
  OperationMode,
  WaterHeaterEntity,
} from "../../../data/water_heater";
import {
  compareWaterHeaterOperationMode,
  computeOperationModeIcon,
} from "../../../data/water_heater";
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
    await import(
      "../editor/config-elements/hui-water-heater-operation-modes-card-feature-editor"
    );
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

  private async _valueChanged(ev: CustomEvent) {
    const mode = (ev.detail as any).value as OperationMode;

    if (mode === this._stateObj!.state) return;

    const oldMode = this._stateObj!.state as OperationMode;
    this._currentOperationMode = mode;

    try {
      await this._setMode(mode);
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

    const options = filterModes(
      orderedModes,
      this._config.operation_modes
    ).map<ControlSelectOption>((mode) => ({
      value: mode,
      label: this.hass!.formatEntityState(this._stateObj!, mode),
      path: computeOperationModeIcon(mode as OperationMode),
    }));

    return html`
      <ha-control-select
        .options=${options}
        .value=${this._currentOperationMode}
        @value-changed=${this._valueChanged}
        hide-label
        .ariaLabel=${this.hass.localize("ui.card.water_heater.mode")}
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
