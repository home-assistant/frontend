import "../../../../src/components/ha-temp-color-picker";

import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";

import "../../../../src/components/ha-card";
import "../../../../src/components/ha-slider";

@customElement("demo-components-ha-temp-color-picker")
export class DemoHaTempColorPicker extends LitElement {
  @state()
  min = 3000;

  @state()
  max = 7000;

  @state()
  value = 4000;

  @state()
  liveValue?: number;

  private _minChanged(ev) {
    this.min = Number(ev.target.value);
  }

  private _maxChanged(ev) {
    this.max = Number(ev.target.value);
  }

  private _valueChanged(ev) {
    this.value = Number(ev.target.value);
  }

  private _tempColorCursor(ev) {
    this.liveValue = ev.detail.value;
  }

  private _tempColorChanged(ev) {
    this.value = ev.detail.value;
  }

  protected render(): TemplateResult {
    return html`
      <ha-card>
        <div class="card-content">
          <p class="value">${this.liveValue ?? this.value} K</p>
          <ha-temp-color-picker
            .min=${this.min}
            .max=${this.max}
            .value=${this.value}
            @value-changed=${this._tempColorChanged}
            @cursor-moved=${this._tempColorCursor}
          ></ha-temp-color-picker>
          <p>Min temp : ${this.min} K</p>
          <ha-slider
            step="1"
            pin
            min="2000"
            max="10000"
            .value=${this.min}
            @change=${this._minChanged}
          >
          </ha-slider>
          <p>Max temp : ${this.max} K</p>
          <ha-slider
            step="1"
            pin
            min="2000"
            max="10000"
            .value=${this.max}
            @change=${this._maxChanged}
          >
          </ha-slider>
          <p>Value : ${this.value} K</p>
          <ha-slider
            step="1"
            pin
            min=${this.min}
            max=${this.max}
            .value=${this.value}
            @change=${this._valueChanged}
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
      ha-temp-color-picker {
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
    "demo-components-ha-temp-color-picker": DemoHaTempColorPicker;
  }
}
