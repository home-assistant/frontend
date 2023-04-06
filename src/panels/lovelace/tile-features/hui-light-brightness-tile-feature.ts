import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import "../../../components/ha-control-slider";
import { UNAVAILABLE } from "../../../data/entity";
import { lightSupportsBrightness } from "../../../data/light";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature } from "../types";
import { LightBrightnessTileFeatureConfig } from "./types";

export const supportsLightBrightnessTileFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "light" && lightSupportsBrightness(stateObj);
};

@customElement("hui-light-brightness-tile-feature")
class HuiLightBrightnessTileFeature
  extends LitElement
  implements LovelaceTileFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: LightBrightnessTileFeatureConfig;

  static getStubConfig(): LightBrightnessTileFeatureConfig {
    return {
      type: "light-brightness",
    };
  }

  public setConfig(config: LightBrightnessTileFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsLightBrightnessTileFeature(this.stateObj)
    ) {
      return nothing;
    }

    const position =
      this.stateObj.attributes.brightness != null
        ? Math.max(
            Math.round((this.stateObj.attributes.brightness * 100) / 255),
            1
          )
        : undefined;

    return html`
      <div class="container">
        <ha-control-slider
          .value=${position}
          min="1"
          max="100"
          .showHandle=${stateActive(this.stateObj)}
          .disabled=${this.stateObj!.state === UNAVAILABLE}
          @value-changed=${this._valueChanged}
          .label=${this.hass.localize("ui.card.light.brightness")}
        ></ha-control-slider>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;

    this.hass!.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      brightness_pct: value,
    });
  }

  static get styles() {
    return css`
      ha-control-slider {
        --control-slider-color: var(--tile-color);
        --control-slider-background: var(--tile-color);
        --control-slider-background-opacity: 0.2;
        --control-slider-thickness: 40px;
        --control-slider-border-radius: 10px;
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
    "hui-light-brightness-tile-feature": HuiLightBrightnessTileFeature;
  }
}
