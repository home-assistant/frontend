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
import {
  LightColorMode,
  lightSupportsColorMode,
  type LightEntity,
} from "../../../data/light";
import { generateColorTemperatureGradient } from "../../../dialogs/more-info/components/lights/light-color-temp-picker";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LightColorTempCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const supportsLightColorTempCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
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
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public context!: LovelaceCardFeatureContext;

  @state() private _config?: LightColorTempCardFeatureConfig;

  private get _stateObj(): LightEntity | undefined {
    return this.hass.states[this.context.entity_id!] as LightEntity | undefined;
  }

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
      !this._stateObj ||
      !supportsLightColorTempCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    const position =
      this._stateObj.attributes.color_temp_kelvin != null
        ? this._stateObj.attributes.color_temp_kelvin
        : undefined;

    const minKelvin =
      this._stateObj.attributes.min_color_temp_kelvin ?? DEFAULT_MIN_KELVIN;
    const maxKelvin =
      this._stateObj.attributes.max_color_temp_kelvin ?? DEFAULT_MAX_KELVIN;

    const gradient = this._generateTemperatureGradient(minKelvin!, maxKelvin);

    return html`
      <ha-control-slider
        .value=${position}
        mode="cursor"
        .showHandle=${stateActive(this._stateObj)}
        .disabled=${this._stateObj!.state === UNAVAILABLE}
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
    `;
  }

  private _generateTemperatureGradient = memoizeOne(
    (min: number, max: number) => generateColorTemperatureGradient(min, max)
  );

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;

    this.hass!.callService("light", "turn_on", {
      entity_id: this._stateObj!.entity_id,
      color_temp_kelvin: value,
    });
  }

  static get styles() {
    return [
      cardFeatureStyles,
      css`
        ha-control-slider {
          --control-slider-background: -webkit-linear-gradient(
            left,
            var(--gradient)
          );
          --control-slider-background-opacity: 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-light-color-temp-card-feature": HuiLightColorTempCardFeature;
  }
}
