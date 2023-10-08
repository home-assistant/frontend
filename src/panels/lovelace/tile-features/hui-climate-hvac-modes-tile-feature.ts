import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import {
  ClimateEntity,
  compareClimateHvacModes,
  computeHvacModeIcon,
  HvacMode,
} from "../../../data/climate";
import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature, LovelaceTileFeatureEditor } from "../types";
import { ClimateHvacModesTileFeatureConfig } from "./types";

export const supportsClimateHvacModesTileFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "climate";
};

@customElement("hui-climate-hvac-modes-tile-feature")
class HuiClimateHvacModeTileFeature
  extends LitElement
  implements LovelaceTileFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: ClimateEntity;

  @state() private _config?: ClimateHvacModesTileFeatureConfig;

  @state() _currentHvacMode?: HvacMode;

  static getStubConfig(
    _,
    stateObj?: HassEntity
  ): ClimateHvacModesTileFeatureConfig {
    return {
      type: "climate-hvac-modes",
      hvac_modes: stateObj?.attributes.hvac_modes || [],
    };
  }

  public static async getConfigElement(): Promise<LovelaceTileFeatureEditor> {
    await import(
      "../editor/config-elements/hui-climate-hvac-modes-tile-feature-editor"
    );
    return document.createElement("hui-climate-hvac-modes-tile-feature-editor");
  }

  public setConfig(config: ClimateHvacModesTileFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj") && this.stateObj) {
      this._currentHvacMode = this.stateObj.state as HvacMode;
    }
  }

  private async _valueChanged(ev: CustomEvent) {
    const mode = (ev.detail as any).value as HvacMode;

    if (mode === this.stateObj!.state) return;

    const oldMode = this.stateObj!.state as HvacMode;
    this._currentHvacMode = mode;

    try {
      await this._setMode(mode);
    } catch (err) {
      this._currentHvacMode = oldMode;
    }
  }

  private async _setMode(mode: HvacMode) {
    await this.hass!.callService("climate", "set_hvac_mode", {
      entity_id: this.stateObj!.entity_id,
      hvac_mode: mode,
    });
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsClimateHvacModesTileFeature(this.stateObj)
    ) {
      return null;
    }

    const color = stateColorCss(this.stateObj);

    const modes = this._config.hvac_modes || [];

    const options = modes
      .filter((mode) => this.stateObj?.attributes.hvac_modes.includes(mode))
      .sort(compareClimateHvacModes)
      .map<ControlSelectOption>((mode) => ({
        value: mode,
        label: this.hass!.formatEntityState(this.stateObj!, mode),
        path: computeHvacModeIcon(mode),
      }));

    return html`
      <div class="container">
        <ha-control-select
          .options=${options}
          .value=${this._currentHvacMode}
          @value-changed=${this._valueChanged}
          hide-label
          .ariaLabel=${this.hass.localize("ui.card.climate.mode")}
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
      .container {
        padding: 0 12px 12px 12px;
        width: auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-modes-hvac-modes-feature": HuiClimateHvacModeTileFeature;
  }
}
