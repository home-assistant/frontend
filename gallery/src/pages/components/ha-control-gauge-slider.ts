import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-control-gauge-slider";

@customElement("demo-components-ha-control-gauge-slider")
export class DemoHaGaugeSlider extends LitElement {
  @state()
  private primary = 0.25;

  @state()
  private secondary = 0.75;

  @state()
  private draftPrimary?: number;

  @state()
  private draftSecondary?: number;

  private _valueChanged(ev) {
    this.primary = ev.detail.value;
  }

  private _draftValueChanged(ev) {
    this.draftPrimary = ev.detail.value;
  }

  private _endValueChanged(ev) {
    this.secondary = ev.detail.value;
  }

  private _draftEndValueChanged(ev) {
    this.draftSecondary = ev.detail.value;
  }

  protected render(): TemplateResult {
    return html`
      <ha-card>
        <ha-control-gauge-slider
          @value-changed=${this._valueChanged}
          @cursor-moved=${this._draftValueChanged}
          .value=${this.primary}
        ></ha-control-gauge-slider>
        <code>
          Value: ${this.primary}
          <br />
          Position: ${this.draftPrimary ?? "-"}
        </code>
        <ha-control-gauge-slider
          dual
          @start-value-changed=${this._valueChanged}
          @start-cursor-moved=${this._draftValueChanged}
          @end-value-changed=${this._endValueChanged}
          @end-cursor-moved=${this._draftEndValueChanged}
          .startValue=${this.primary}
          .endValue=${this.secondary}
        ></ha-control-gauge-slider>
        <code>
          Start value: ${this.primary}
          <br />
          Start position: ${this.draftPrimary ?? "-"}
          <br />
          End value: ${this.secondary}
          <br />
          End position: ${this.draftSecondary ?? "-"}
        </code>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      ha-card {
        max-width: 600px;
        margin: 24px auto;
        padding: 0 12px;
      }
      ha-control-gauge-slider {
        --control-gauge-slider-color: #ff9800;
        --control-gauge-slider-background: #ff9800;
        --control-gauge-slider-background-opacity: 0.3;
      }
      ha-control-gauge-slider[dual] {
        --control-gauge-slider-end-color: #2196f3;
        --control-gauge-slider-start-color: #ff9800;
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
