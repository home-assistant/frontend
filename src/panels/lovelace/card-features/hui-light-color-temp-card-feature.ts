import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import {
  DEFAULT_MAX_KELVIN,
  DEFAULT_MIN_KELVIN,
} from "../../../common/color/convert-light-color";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import "../../../components/ha-control-slider";
import { UNAVAILABLE } from "../../../data/entity";
import { DOMAIN_ATTRIBUTES_UNITS } from "../../../data/entity_attributes";
import { LightColorMode, lightSupportsColorMode } from "../../../data/light";
import { generateColorTemperatureGradient } from "../../../dialogs/more-info/components/lights/light-color-temp-picker";
import { HomeAssistant } from "../../../types";
import { LovelaceCardFeature } from "../types";
import { LightColorTempCardFeatureConfig } from "./types";

export const supportsLightColorTempCardFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "light" &&
    lightSupportsColorMode(stateObj, LightColorMode.COLOR_TEMP)
  );
};

@customElement("hui-light-color-temp-card-feature")
class HuiLightColorTempCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: LightColorTempCardFeatureConfig;

  static getStubConfig(): LightColorTempCardFeatureConfig {
    return {
      type: "light-color-temp",
    };
  }

  public setConfig(config: LightColorTempCardFeatureConfig): void {
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
      !supportsLightColorTempCardFeature(this.stateObj)
    ) {
      return nothing;
    }

    const position =
      this.stateObj.attributes.color_temp_kelvin != null
        ? this.stateObj.attributes.color_temp_kelvin
        : undefined;

    const minKelvin =
      this.stateObj.attributes.min_color_temp_kelvin ?? DEFAULT_MIN_KELVIN;
    const maxKelvin =
      this.stateObj.attributes.max_color_temp_kelvin ?? DEFAULT_MAX_KELVIN;

    const gradient = this._generateTemperatureGradient(minKelvin!, maxKelvin);

    return html`
      <div class="container">
        <ha-control-slider
          .value=${position}
          mode="cursor"
          .showHandle=${stateActive(this.stateObj)}
          .disabled=${this.stateObj!.state === UNAVAILABLE}
          @value-changed=${this._valueChanged}
          .label=${this.hass.localize("ui.card.light.color_temperature")}
          .min=${minKelvin}
          .max=${maxKelvin}
          style=${styleMap({
            "--gradient": gradient,
          })}
          .unit=${DOMAIN_ATTRIBUTES_UNITS.light.color_temp_kelvin}
          .locale=${this.hass.locale}
        ></ha-control-slider>
      </div>
    `;
  }

  private _generateTemperatureGradient = memoizeOne(
    (min: number, max: number) => generateColorTemperatureGradient(min, max)
  );

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
        --control-slider-color: var(--feature-color);
        --control-slider-background: -webkit-linear-gradient(
          left,
          var(--gradient)
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
    "hui-light-color-temp-card-feature": HuiLightColorTempCardFeature;
  }
}
