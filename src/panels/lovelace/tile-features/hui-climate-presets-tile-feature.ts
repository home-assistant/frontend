import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { stateColorCss } from "../../../common/entity/state_color";
import { ClimateEntity, computePresetModeIcon } from "../../../data/climate";
import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature } from "../types";
import { ClimatePresetsTileFeatureConfig } from "./types";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-control-select";
import "../../../components/ha-control-slider";

export const supportsClimatePresetsTileFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "climate";
};

@customElement("hui-climate-presets-tile-feature")
class HuiClimatePresetsTileFeature
  extends LitElement
  implements LovelaceTileFeature {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: ClimateEntity;

  @state() private _config?: ClimatePresetsTileFeatureConfig;

  @state() _currentPreset?: string;

  static getStubConfig(): ClimatePresetsTileFeatureConfig {
    return {
      type: "climate-presets",
    };
  }

  public setConfig(config: ClimatePresetsTileFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj") && this.stateObj) {
      this._currentPreset = this.stateObj.attributes.preset_mode as string;
    }
  }

  private async _valueChanged(ev: CustomEvent) {
    const preset = (ev.detail as any).value as string;
    const oldPreset = this.stateObj!.attributes.preset_mode

    if (preset === oldPreset) return;
    this._currentPreset = preset;

    try {
      await this._setPreset(preset);
    } catch (err) {
      this._currentPreset = oldPreset;
    }
  }

  private async _setPreset(preset: string) {
    await this.hass!.callService("climate", "set_preset_mode", {
      entity_id: this.stateObj!.entity_id,
      preset_mode: preset,
    })
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsClimatePresetsTileFeature(this.stateObj)
    ) {
      return null;
    }

    const color = stateColorCss(this.stateObj);

    const presets = this.stateObj.attributes.preset_modes as string[] || [];

    const options = presets
      .map<ControlSelectOption>((preset) => ({
        value: preset,
        label: this.hass!.formatEntityAttributeName(this.stateObj!, preset),
        path: computePresetModeIcon(preset),
      }));

    return html`
      <div class="container">
        <ha-control-select
          .options=${options}
          .value=${this._currentPreset}
          @value-changed=${this._valueChanged}
          hide-label
          .ariaLabel=${this.hass.localize("ui.card.climate.preset")}
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
    "hui-climate-preset-tile-feature": HuiClimatePresetsTileFeature;
  }
}
