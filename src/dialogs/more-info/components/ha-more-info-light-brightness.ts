import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { hsv2rgb, rgb2hex, rgb2hsv } from "../../../common/color/convert-color";
import { stateActive } from "../../../common/entity/state_active";
import { stateColorCss } from "../../../common/entity/state_color";
import { LightEntity } from "../../../data/light";
import { HomeAssistant } from "../../../types";
import "../../../components/ha-bar-slider";
import { UNAVAILABLE } from "../../../data/entity";

@customElement("ha-more-info-light-brightness")
export class HaMoreInfoLightBrightness extends LitElement {
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
      <ha-bar-slider
        vertical
        .value=${this.value}
        min="1"
        max="100"
        .showHandle=${stateActive(this.stateObj)}
        @value-changed=${this._valueChanged}
        aria-label="Brightness slider"
        style=${styleMap({
          "--slider-bar-color": color,
        })}
        .disabled=${this.stateObj.state === UNAVAILABLE}
      >
      </ha-bar-slider>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-bar-slider {
        height: 320px;
        --slider-bar-thickness: 100px;
        --slider-bar-border-radius: 24px;
        --slider-bar-color: var(--primary-color);
        --slider-bar-background: var(--disabled-color);
        --slider-bar-background-opacity: 0.2;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-light-brightness": HaMoreInfoLightBrightness;
  }
}
