import "../../../../src/components/ha-color-temp-brightness-picker";

import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";

import "../../../../src/components/ha-card";
import "../../../../src/components/ha-slider";

const MIN_KELVIN = 2000;
const MAX_KELVIN = 6500;

@customElement("demo-components-ha-color-temp-brightness-picker")
export class DemoHaColorTempBrightnessPicker extends LitElement {
  @state()
  value: [number, number] = [3000, 50];

  @state()
  liveValue?: [number, number];

  private _valueCursor(ev) {
    this.liveValue = ev.detail.value;
  }

  private _valueChanged(ev) {
    this.value = ev.detail.value;
  }

  private _kelvinChanged(ev) {
    this.value = [Number(ev.target.value), this.value[1]];
  }

  private _brightnessChanged(ev) {
    this.value = [this.value[0], Number(ev.target.value)];
  }

  protected render(): TemplateResult {
    const [kelvin, brightness] = this.liveValue ?? this.value;

    return html`
      <ha-card>
        <div class="card-content">
          <p class="value">${kelvin} K - ${brightness}%</p>
          <ha-color-temp-brightness-picker
            .value=${this.value}
            .minKelvin=${MIN_KELVIN}
            .maxKelvin=${MAX_KELVIN}
            @value-changed=${this._valueChanged}
            @cursor-moved=${this._valueCursor}
          ></ha-color-temp-brightness-picker>
          <p>Color temperature: ${this.value[0]} K</p>
          <ha-slider
            labeled
            step="1"
            .min=${MIN_KELVIN}
            .max=${MAX_KELVIN}
            .value=${this.value[0]}
            @change=${this._kelvinChanged}
          >
          </ha-slider>
          <p>Brightness: ${this.value[1]}%</p>
          <ha-slider
            labeled
            step="1"
            min="1"
            max="100"
            .value=${this.value[1]}
            @change=${this._brightnessChanged}
          >
          </ha-slider>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      max-width: 600px;
      margin: 24px auto;
    }
    .card-content {
      display: flex;
      align-items: center;
      flex-direction: column;
    }
    ha-color-temp-brightness-picker {
      width: 320px;
      height: 320px;
    }
    .value {
      font-size: var(--ha-font-size-xl);
      font-weight: var(--ha-font-weight-bold);
      margin: 0 0 12px 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-color-temp-brightness-picker": DemoHaColorTempBrightnessPicker;
  }
}
