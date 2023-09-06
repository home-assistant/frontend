import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
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
import {
  compareWaterHeaterOperationMode,
  computeOperationModeIcon,
  OperationMode,
  WaterHeaterEntity,
} from "../../../data/water_heater";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature, LovelaceTileFeatureEditor } from "../types";
import { WaterHeaterOperationModesTileFeatureConfig } from "./types";

export const supportsWaterHeaterOperationModesTileFeature = (
  stateObj: HassEntity
) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "water_heater";
};

@customElement("hui-water-heater-operation-modes-tile-feature")
class HuiWaterHeaterOperationModeTileFeature
  extends LitElement
  implements LovelaceTileFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: WaterHeaterEntity;

  @state() private _config?: WaterHeaterOperationModesTileFeatureConfig;

  @state() _currentOperationMode?: OperationMode;

  static getStubConfig(
    _,
    stateObj?: HassEntity
  ): WaterHeaterOperationModesTileFeatureConfig {
    return {
      type: "water-heater-operation-modes",
      operation_modes: stateObj?.attributes.operation_list || [],
    };
  }

  public static async getConfigElement(): Promise<LovelaceTileFeatureEditor> {
    await import(
      "../editor/config-elements/hui-water-heater-operation-modes-tile-feature-editor"
    );
    return document.createElement(
      "hui-water-heater-operation-modes-tile-feature-editor"
    );
  }

  public setConfig(config: WaterHeaterOperationModesTileFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj") && this.stateObj) {
      this._currentOperationMode = this.stateObj.state as OperationMode;
    }
  }

  private async _valueChanged(ev: CustomEvent) {
    const mode = (ev.detail as any).value as OperationMode;

    if (mode === this.stateObj!.state) return;

    const oldMode = this.stateObj!.state as OperationMode;
    this._currentOperationMode = mode;

    try {
      await this._setMode(mode);
    } catch (err) {
      this._currentOperationMode = oldMode;
    }
  }

  private async _setMode(mode: OperationMode) {
    await this.hass!.callService("water_heater", "set_operation_mode", {
      entity_id: this.stateObj!.entity_id,
      operation_mode: mode,
    });
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsWaterHeaterOperationModesTileFeature(this.stateObj)
    ) {
      return null;
    }

    const color = stateColorCss(this.stateObj);

    const modes = this._config.operation_modes || [];

    const options = modes
      .filter((mode) => this.stateObj?.attributes.operation_list.includes(mode))
      .sort(compareWaterHeaterOperationMode)
      .map<ControlSelectOption>((mode) => ({
        value: mode,
        label: this.hass!.formatEntityState(this.stateObj!, mode),
        path: computeOperationModeIcon(mode),
      }));

    return html`
      <div class="container">
        <ha-control-select
          .options=${options}
          .value=${this._currentOperationMode}
          @value-changed=${this._valueChanged}
          hide-label
          .ariaLabel=${this.hass.localize("ui.card.water_heater.mode")}
          style=${styleMap({
            "--control-select-color": color,
          })}
          .disabled=${this.stateObj!.state === UNAVAILABLE}
        >
        </ha-control-select>
      </div>
    `;
  }

  static get styles() {
    return css`
      ha-control-select {
        --control-select-color: var(--tile-color);
        --control-select-padding: 0;
        --control-select-thickness: 40px;
        --control-select-border-radius: 10px;
        --control-select-button-border-radius: 10px;
      }
      ha-control-button-group {
        margin: 0 12px 12px 12px;
        --control-button-group-spacing: 12px;
      }
      .container {
        padding: 0 12px 12px 12px;
        width: auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-water-heater-operation-modes-feature": HuiWaterHeaterOperationModeTileFeature;
  }
}
