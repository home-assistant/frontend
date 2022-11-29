import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/tile/ha-tile-slider";
import { UNAVAILABLE } from "../../../data/entity";
import { FanEntity } from "../../../data/fan";
import { HomeAssistant } from "../../../types";
import { LovelaceTileExtra } from "../types";
import { FanSpeedTileExtraConfig } from "./types";

@customElement("hui-fan-speed-tile-extra")
class HuiFanSpeedTileExtra extends LitElement implements LovelaceTileExtra {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: FanEntity;

  @state() private _config?: FanSpeedTileExtraConfig;

  static getStubConfig(): FanSpeedTileExtraConfig {
    return {
      type: "fan-speed",
    };
  }

  public setConfig(config: FanSpeedTileExtraConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass || !this.stateObj) {
      return html``;
    }

    const percentage = this.stateObj.attributes.percentage;
    const step = this.stateObj.attributes.percentage_step ?? 1;

    return html`
      <div class="container">
        <ha-tile-slider
          .value=${percentage}
          min="0"
          max="100"
          .disabled=${this.stateObj!.state === UNAVAILABLE}
          @value-changed=${this._valueChanged}
          .label=${this.hass.localize("ui.card.fan.speed")}
          .step=${step}
        ></ha-tile-slider>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;

    this.hass!.callService("fan", "set_percentage", {
      entity_id: this.stateObj!.entity_id,
      percentage: value,
    });
  }

  static get styles() {
    return css`
      ha-tile-slider {
        --tile-slider-bar-color: rgb(var(--tile-color));
        --tile-slider-bar-background: rgba(var(--tile-color), 0.2);
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
    "hui-fan-speed-tile-extra": HuiFanSpeedTileExtra;
  }
}
