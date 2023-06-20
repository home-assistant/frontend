import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-control-gauge-slider";

@customElement("demo-components-ha-control-gauge-slider")
export class DemoHaGaugeSlider extends LitElement {
  @state()
  private value = 19;

  @state()
  private high = 25;

  @state()
  private changingValue?: number;

  @state()
  private changingHigh?: number;

  private _valueChanged(ev) {
    this.value = ev.detail.value;
  }

  private _valueChanging(ev) {
    this.changingValue = ev.detail.value;
  }

  private _highChanged(ev) {
    this.high = ev.detail.value;
  }

  private _highChanging(ev) {
    this.changingHigh = ev.detail.value;
  }

  protected render(): TemplateResult {
    return html`
      <ha-card>
        <ha-control-gauge-slider
          @value-changed=${this._valueChanged}
          @value-changing=${this._valueChanging}
          .value=${this.value}
          step="1"
          min="10"
          max="30"
        ></ha-control-gauge-slider>
        <code>
          Value: ${this.value} °C
          <br />
          Changing:
          ${this.changingValue != null ? `${this.changingValue} °C` : "-"}
        </code>
        <ha-control-gauge-slider
          dual
          @low-changed=${this._valueChanged}
          @low-changing=${this._valueChanging}
          @high-changed=${this._highChanged}
          @high-changing=${this._highChanging}
          .low=${this.value}
          .high=${this.high}
          step="1"
          min="10"
          max="30"
        ></ha-control-gauge-slider>
        <code>
          Low value: ${this.value} °C
          <br />
          Low changing:
          ${this.changingValue != null ? `${this.changingValue} °C` : "-"}
          <br />
          High value: ${this.high} °C
          <br />
          High changing:
          ${this.changingHigh != null ? `${this.changingHigh} °C` : "-"}
        </code>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      ha-card {
        max-width: 600px;
        margin: 24px auto;
      }
      ha-control-gauge-slider {
        --control-gauge-slider-color: #ff9800;
        --control-gauge-slider-background: #ff9800;
        --control-gauge-slider-background-opacity: 0.3;
      }
      ha-control-gauge-slider[dual] {
        --control-gauge-slider-high-color: #2196f3;
        --control-gauge-slider-low-color: #ff9800;
        --control-gauge-slider-background: var(--disabled-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-control-gauge-slider": DemoHaGaugeSlider;
  }
}
