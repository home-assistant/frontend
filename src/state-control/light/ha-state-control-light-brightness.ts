import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { hsv2rgb, rgb2hex, rgb2hsv } from "../../common/color/convert-color";
import { stateActive } from "../../common/entity/state_active";
import { stateColorCss } from "../../common/entity/state_color";
import "../../components/ha-control-slider";
import { UNAVAILABLE } from "../../data/entity";
import type { LightEntity } from "../../data/light";
import type { HomeAssistant } from "../../types";

@customElement("ha-state-control-light-brightness")
export class HaStateControlLightBrightness extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: LightEntity;

  @state() value?: number;

  protected updated(changedProp: Map<string | number | symbol, unknown>): void {
    if (changedProp.has("stateObj")) {
      this.value =
        this.stateObj.attributes.brightness != null
          ? Math.max(
              Math.round((this.stateObj.attributes.brightness * 100) / 255),
              1
            )
          : undefined;
    }
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;

    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      brightness_pct: value,
    });
  }

  protected render(): TemplateResult {
    let color = stateColorCss(this.stateObj);

    if (this.stateObj.attributes.rgb_color) {
      const hsvColor = rgb2hsv(this.stateObj.attributes.rgb_color);

      // Modify the real rgb color for better contrast
      if (hsvColor[1] < 0.4) {
        // Special case for very light color (e.g: white)
        if (hsvColor[1] < 0.1) {
          hsvColor[2] = 225;
        } else {
          hsvColor[1] = 0.4;
        }
      }
      color = rgb2hex(hsv2rgb(hsvColor));
    }

    return html`
      <ha-control-slider
        touch-action="none"
        vertical
        .value=${this.value}
        min="1"
        max="100"
        .showHandle=${stateActive(this.stateObj)}
        @value-changed=${this._valueChanged}
        .label=${this.hass.formatEntityAttributeName(
          this.stateObj,
          "brightness"
        )}
        style=${styleMap({
          "--control-slider-color": color,
          "--control-slider-background": color,
        })}
        .disabled=${this.stateObj.state === UNAVAILABLE}
        unit="%"
        .locale=${this.hass.locale}
      >
      </ha-control-slider>
    `;
  }

  static styles = css`
    ha-control-slider {
      position: relative;
      height: 45vh;
      max-height: 320px;
      min-height: 200px;
      --control-slider-thickness: 130px;
      --control-slider-border-radius: 36px;
      --control-slider-color: var(--primary-color);
      --control-slider-background: var(--disabled-color);
      --control-slider-background-opacity: 0.2;
      --control-slider-tooltip-font-size: var(--ha-font-size-xl);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-control-light-brightness": HaStateControlLightBrightness;
  }
}
