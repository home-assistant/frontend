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
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      ha-card {
        max-width: 600px;
        margin: 24px auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-control-gauge-slider": DemoHaGaugeSlider;
  }
}
