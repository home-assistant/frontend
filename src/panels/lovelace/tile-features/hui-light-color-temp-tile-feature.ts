import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import "../../../components/ha-control-slider";
import { UNAVAILABLE } from "../../../data/entity";
import { LightColorMode, lightSupportsColorMode } from "../../../data/light";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature } from "../types";
import { LightColorTempTileFeatureConfig } from "./types";

export const supportsLightColorTempTileFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "light" &&
    lightSupportsColorMode(stateObj, LightColorMode.COLOR_TEMP)
  );
};

@customElement("hui-light-color-temp-tile-feature")
class HuiLightColorTempTileFeature
  extends LitElement
  implements LovelaceTileFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: LightColorTempTileFeatureConfig;

  static getStubConfig(): LightColorTempTileFeatureConfig {
    return {
      type: "light-color-temp",
    };
  }

  public setConfig(config: LightColorTempTileFeatureConfig): void {
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
      !supportsLightColorTempTileFeature(this.stateObj)
    ) {
      return nothing;
    }

    const position =
      this.stateObj.attributes.color_temp_kelvin != null
        ? this.stateObj.attributes.color_temp_kelvin
        : undefined;

    return html`
      <div class="container">
        <ha-control-slider
          .value=${position}
          mode="cursor"
          .showHandle=${stateActive(this.stateObj)}
          .disabled=${this.stateObj!.state === UNAVAILABLE}
          @value-changed=${this._valueChanged}
          .label=${this.hass.localize("ui.card.light.color_temperature")}
          .min=${this.stateObj.attributes.min_color_temp_kelvin!}
          .max=${this.stateObj.attributes.max_color_temp_kelvin!}
        ></ha-control-slider>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;

    this.hass!.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      color_temp_kelvin: value,
    });
  }

  static get styles() {
    return css`
      ha-control-slider {
        --control-slider-background: -webkit-linear-gradient(
          left,
          rgb(255, 160, 0) 0%,
          white 50%,
          rgb(166, 209, 255) 100%
        );
        --control-slider-background-opacity: 1;
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
    "hui-light-color-temp-tile-feature": HuiLightColorTempTileFeature;
  }
}
