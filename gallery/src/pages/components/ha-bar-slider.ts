import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../../src/components/ha-bar-slider";
import "../../../../src/components/ha-card";

@customElement("demo-components-ha-bar-slider")
export class DemoHaBarSlider extends LitElement {
  @state() private value = 50;

  @state() private sliderPosition?: number;

  handleValueChanged(e: CustomEvent) {
    this.value = e.detail.value as number;
  }

  handleSliderMoved(e: CustomEvent) {
    this.sliderPosition = e.detail.value as number;
  }

  protected render(): TemplateResult {
    return html`
      <ha-card>
        <ha-bar-slider
          .value=${this.value}
          @value-changed=${this.handleValueChanged}
          @slider-moved=${this.handleSliderMoved}
          track-mode="active"
        ></ha-bar-slider>
        <ha-bar-slider
          .value=${this.value}
          @value-changed=${this.handleValueChanged}
          @slider-moved=${this.handleSliderMoved}
          track-mode="indicator"
        ></ha-bar-slider>
        <ha-bar-slider
          .value=${this.value}
          @value-changed=${this.handleValueChanged}
          @slider-moved=${this.handleSliderMoved}
          track-mode="active"
          class="light"
        ></ha-bar-slider>
        <p>value : ${this.value} position: ${this.sliderPosition}</p>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      ha-card {
        max-width: 600px;
        margin: 24px auto;
        padding: 16px;
      }
      ha-bar-slider {
        display: block;
        margin-bottom: 12px;
      }
      .light {
        --main-color: #ffcf4c;
        --bg-color: #ffcf4c4a;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-bar-slider": DemoHaBarSlider;
  }
}
