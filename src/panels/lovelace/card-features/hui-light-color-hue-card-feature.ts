import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import "../../../components/ha-control-slider";
import { UNAVAILABLE } from "../../../data/entity";
import { LightColorMode, lightSupportsColorMode } from "../../../data/light";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type { LightColorHueCardFeatureConfig } from "./types";
import { hsv2rgb, rgb2hex } from "../../../common/color/convert-color";

const generateColorHueGradient = () => {
  const count = 10;
  const gradient: [number, string][] = [];
  const percentageStep = 1 / count;

  for (let i = 0; i < count + 1; i++) {
    const value = i * percentageStep * 360;
    const hex = rgb2hex(hsv2rgb([value, 1, 255]));
    gradient.push([percentageStep * i, hex]);
  }

  return gradient
    .map(([stop, color]) => `${color} ${(stop as number) * 100}%`)
    .join(", ");
};

export const supportsLightColorHueCardFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "light" && lightSupportsColorMode(stateObj, LightColorMode.HS)
  );
};

@customElement("hui-light-color-hue-card-feature")
class HuiLightColorHueCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: LightColorHueCardFeatureConfig;

  static getStubConfig(): LightColorHueCardFeatureConfig {
    return {
      type: "light-color-hue",
    };
  }

  public setConfig(config: LightColorHueCardFeatureConfig): void {
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
      !supportsLightColorHueCardFeature(this.stateObj)
    ) {
      return nothing;
    }

    const position =
      this.stateObj.attributes.hs_color != null
        ? this.stateObj.attributes.hs_color[0]
        : undefined;

    const gradient = this._generateHueGradient();

    return html`
      <ha-control-slider
        .value=${position}
        mode="cursor"
        .showHandle=${stateActive(this.stateObj)}
        .disabled=${this.stateObj!.state === UNAVAILABLE}
        @value-changed=${this._valueChanged}
        .label=${this.hass.localize("ui.card.light.color_hue")}
        min="0"
        max="360"
        style=${styleMap({
          "--gradient": gradient,
        })}
        .locale=${this.hass.locale}
      ></ha-control-slider>
    `;
  }

  private _generateHueGradient = memoizeOne(() => generateColorHueGradient());

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;

    this.hass!.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      hs_color: [value, 100],
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
    "hui-light-color-hue-card-feature": HuiLightColorHueCardFeature;
  }
}
