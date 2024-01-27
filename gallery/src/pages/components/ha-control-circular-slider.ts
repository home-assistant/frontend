import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-control-circular-slider";
import "../../../../src/components/ha-slider";

@customElement("demo-components-ha-control-circular-slider")
export class DemoHaCircularSlider extends LitElement {
  @state()
  private current = 22;

  @state()
  private low = 19;

  @state()
  private high = 25;

  @state()
  private changingLow?: number;

  @state()
  private changingHigh?: number;

  private _lowChanged(ev) {
    this.low = ev.detail.value;
  }

  private _lowChanging(ev) {
    this.changingLow = ev.detail.value;
  }

  private _highChanged(ev) {
    this.high = ev.detail.value;
  }

  private _highChanging(ev) {
    this.changingHigh = ev.detail.value;
  }

  private _currentChanged(ev) {
    this.current = ev.currentTarget.value;
  }

  protected render(): TemplateResult {
    return html`
      <ha-card>
        <div class="card-content">
          <p class="title"><b>Config</b></p>
          <div class="field">
            <p>Current</p>
            <ha-slider
              labeled
              min="10"
              max="30"
              .value=${this.current}
              @change=${this._currentChanged}
            ></ha-slider>
            <p>${this.current} °C</p>
          </div>
        </div>
      </ha-card>
      <ha-card>
        <div class="card-content">
          <p class="title"><b>Single</b></p>
          <ha-control-circular-slider
            @value-changed=${this._lowChanged}
            @value-changing=${this._lowChanging}
            .value=${this.low}
            .current=${this.current}
            step="1"
            min="10"
            max="30"
          ></ha-control-circular-slider>
          <div>
            Low: ${this.low} °C
            <br />
            Changing:
            ${this.changingLow != null ? `${this.changingLow} °C` : "-"}
          </div>
        </div>
      </ha-card>
      <ha-card>
        <div class="card-content">
          <p class="title"><b>Inverted</b></p>
          <ha-control-circular-slider
            inverted
            @value-changed=${this._highChanged}
            @value-changing=${this._highChanging}
            .value=${this.high}
            .current=${this.current}
            step="1"
            min="10"
            max="30"
          ></ha-control-circular-slider>
          <div>
            High: ${this.high} °C
            <br />
            Changing:
            ${this.changingHigh != null ? `${this.changingHigh} °C` : "-"}
          </div>
        </div>
      </ha-card>
      <ha-card>
        <div class="card-content">
          <p class="title"><b>Dual</b></p>
          <ha-control-circular-slider
            dual
            @low-changed=${this._lowChanged}
            @low-changing=${this._lowChanging}
            @high-changed=${this._highChanged}
            @high-changing=${this._highChanging}
            .low=${this.low}
            .high=${this.high}
            .current=${this.current}
            step="1"
            min="10"
            max="30"
          ></ha-control-circular-slider>
          <div>
            Low value: ${this.low} °C
            <br />
            Low changing:
            ${this.changingLow != null ? `${this.changingLow} °C` : "-"}
            <br />
            High value: ${this.high} °C
            <br />
            High changing:
            ${this.changingHigh != null ? `${this.changingHigh} °C` : "-"}
          </div>
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
      pre {
        margin-top: 0;
        margin-bottom: 8px;
      }
      p {
        margin: 0;
      }
      p.title {
        margin-bottom: 12px;
      }
      ha-control-circular-slider {
        --control-circular-slider-color: #ff9800;
      }
      ha-control-circular-slider[inverted] {
        --control-circular-slider-color: #2196f3;
      }
      ha-control-circular-slider[dual] {
        --control-circular-slider-high-color: #2196f3;
        --control-circular-slider-low-color: #ff9800;
      }
      .field {
        display: flex;
        flex-direction: row;
        align-items: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-control-circular-slider": DemoHaCircularSlider;
  }
}
