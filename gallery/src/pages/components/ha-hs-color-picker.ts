import "../../../../src/components/ha-hs-color-picker";

import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";

import "../../../../src/components/ha-card";
import "../../../../src/components/ha-slider";
import { hsv2rgb } from "../../../../src/common/color/convert-color";

@customElement("demo-components-ha-hs-color-picker")
export class DemoHaHsColorPicker extends LitElement {
  @state()
  brightness = 255;

  @state()
  value: [number, number] = [0, 0];

  @state()
  liveValue?: [number, number];

  private _brightnessChanged(ev) {
    this.brightness = Number(ev.target.value);
  }

  private _hsColorCursor(ev) {
    this.liveValue = ev.detail.value;
  }

  private _hsColorChanged(ev) {
    this.value = ev.detail.value;
  }

  private _hueChanged(ev) {
    this.value = [ev.target.value, this.value[1]];
  }

  private _saturationChanged(ev) {
    this.value = [this.value[0], ev.target.value];
  }

  protected render(): TemplateResult {
    const h = (this.liveValue ?? this.value)[0];
    const s = (this.liveValue ?? this.value)[1];

    const rgb = hsv2rgb([h, s, this.brightness]);

    return html`
      <ha-card>
        <div class="card-content">
          <p class="value">${h}° - ${Math.round(s * 100)}%</p>
          <p class="value">${rgb.map((v) => Math.round(v)).join(", ")}</p>
          <ha-hs-color-picker
            colorBrightness=${this.brightness}
            .value=${this.value}
            @value-changed=${this._hsColorChanged}
            @cursor-moved=${this._hsColorCursor}
          ></ha-hs-color-picker>
          <p>Hue : ${this.value[0]}</p>
          <ha-slider
            labeled
            step="1"
            min="0"
            max="360"
            .value=${this.value[0]}
            @change=${this._hueChanged}
          >
          </ha-slider>
          <p>Saturation : ${this.value[1]}</p>
          <ha-slider
            labeled
            step="0.01"
            min="0"
            max="1"
            .value=${this.value[1]}
            @change=${this._saturationChanged}
          >
          </ha-slider>
          <p>Color Brighness : ${this.brightness}</p>
          <ha-slider
            labeled
            step="1"
            min="0"
            max="255"
            .value=${this.brightness}
            @change=${this._brightnessChanged}
          >
          </ha-slider>
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      ha-card {
        max-width: 600px;
        margin: 24px auto;
      }
      .card-content {
        display: flex;
        align-items: center;
        flex-direction: column;
      }
      ha-hs-color-picker {
        width: 400px;
      }
      .value {
        font-size: 22px;
        font-weight: bold;
        margin: 0 0 12px 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-hs-color-picker": DemoHaHsColorPicker;
  }
}
