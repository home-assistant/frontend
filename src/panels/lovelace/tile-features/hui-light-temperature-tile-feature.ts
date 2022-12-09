import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature } from "../types";
import { LightTemperatureTileFeatureConfig } from "./types";
import "../../../components/tile/ha-tile-slider";

@customElement("hui-light-temperature-tile-feature")
class HuiLightTemperatureTileFeature
  extends LitElement
  implements LovelaceTileFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: LightTemperatureTileFeatureConfig;

  static getStubConfig(): LightTemperatureTileFeatureConfig {
    return {
      type: "light-temperature",
    };
  }

  public setConfig(config: LightTemperatureTileFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass || !this.stateObj) {
      return html``;
    }

    const position =
      this.stateObj.attributes.color_temp_kelvin != null
        ? this.stateObj.attributes.color_temp_kelvin
        : undefined;

    return html`
      <div class="container">
        <ha-tile-slider
          .value=${position}
          min=${this.stateObj.attributes.min_color_temp_kelvin}
          max=${this.stateObj.attributes.max_color_temp_kelvin}
          .disabled=${this.stateObj!.state === UNAVAILABLE}
          @value-changed=${this._valueChanged}
          .label=${this.hass.localize("ui.card.light.brightness")}
          mode="cursor"
        ></ha-tile-slider>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;

    this.hass!.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      kelvin: value,
    });
  }

  static get styles() {
    return css`
      ha-tile-slider {
        --tile-slider-bar-background: -webkit-linear-gradient(
          var(--float-end),
          rgb(166, 209, 255) 0%,
          white 50%,
          rgb(255, 160, 0) 100%
        );
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
    "hui-light-temperature-tile-feature": HuiLightTemperatureTileFeature;
  }
}
