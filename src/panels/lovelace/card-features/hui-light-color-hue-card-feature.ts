import { customElement, property, state } from "lit/decorators";
import { html, LitElement, nothing } from "lit";
import memoizeOne from "memoize-one";
import { styleMap } from "lit/directives/style-map";
import type { HassEntity } from "home-assistant-js-websocket";
import { UNAVAILABLE } from "../../../data/entity";
import { computeDomain } from "../../../common/entity/compute_domain";
import { LightColorMode, lightSupportsColorMode } from "../../../data/light";
import { stateActive } from "../../../common/entity/state_active";
import "../../../components/ha-control-slider";
import type { LovelaceCardFeature } from "../types";
import type { LightColorHueCardFeatureConfig } from "./types";
import type { HomeAssistant } from "../../../types";
import { hsv2rgb, rgb2hsv } from "../../../common/color/convert-color";

export const supportsLightColorHueCardFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "light" &&
    (lightSupportsColorMode(stateObj, LightColorMode.XY) ||
      lightSupportsColorMode(stateObj, LightColorMode.XY) ||
      lightSupportsColorMode(stateObj, LightColorMode.RGB) ||
      lightSupportsColorMode(stateObj, LightColorMode.RGBW) ||
      lightSupportsColorMode(stateObj, LightColorMode.RGBWW))
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

    // Convert to hue
    const rgbColor = this.stateObj.attributes.rgb_color || [255, 255, 255];
    const [hue] = rgb2hsv(rgbColor);

    const gradient = this._generateColorGradient();

    return html`
      <ha-control-slider
        .value=${hue}
        mode="cursor"
        .showHandle=${stateActive(this.stateObj)}
        .disabled=${this.stateObj!.state === UNAVAILABLE}
        @value-changed=${this._valueChanged}
        .label=${this.hass.localize("ui.card.light.color")}
        .min=${0}
        .max=${360}
        .step=${1}
        style=${styleMap({
          "--control-slider-background": gradient,
        })}
      >
      </ha-control-slider>
    `;
  }

  private _generateColorGradient = memoizeOne(() => {
    const colors = [
      "rgb(255, 0, 0)", // Red (0°)
      "rgb(255, 127, 0)", // Orange (30°)
      "rgb(255, 255, 0)", // Yellow (60°)
      "rgb(127, 255, 0)", // Yellow-Green (90°)
      "rgb(0, 255, 0)", // Green (120°)
      "rgb(0, 255, 127)", // Green-Cyan (150°)
      "rgb(0, 255, 255)", // Cyan (180°)
      "rgb(0, 127, 255)", // Cyan-Blue (210°)
      "rgb(0, 0, 255)", // Blue (240°)
      "rgb(127, 0, 255)", // Blue-Magenta (270°)
      "rgb(255, 0, 255)", // Magenta (300°)
      "rgb(255, 0, 127)", // Magenta-Red (330°)
      "rgb(255, 0, 0)", // Red (360°)
    ];
    return `linear-gradient(to right, ${colors.join(", ")})`;
  });

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const hue = ev.detail.value;

    // Keeps full saturation and brightness
    const [r, g, b] = hsv2rgb([hue, 1, 1]);

    this.hass!.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      rgb_color: [
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255),
      ],
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-light-color-hue-card-feature": HuiLightColorHueCardFeature;
  }
}
