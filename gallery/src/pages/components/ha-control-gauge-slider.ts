import { css, html, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-control-gauge-slider";

@customElement("demo-components-ha-control-gauge-slider")
export class DemoHaGaugeSlider extends LitElement {
  protected render(): TemplateResult {
    return html`
      <ha-card>
        <ha-control-gauge-slider></ha-control-gauge-slider>
        <ha-control-gauge-slider dual></ha-control-gauge-slider>
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
        --control-gauge-slider-color: #926bc7;
        --control-gauge-slider-background: #926bc7;
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
