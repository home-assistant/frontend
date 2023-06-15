import { css, html, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-control-round-slider";

@customElement("demo-components-ha-control-round-slider")
export class DemoHaRoundSlider extends LitElement {
  protected render(): TemplateResult {
    return html`
      <ha-card>
        <ha-control-round-slider></ha-control-round-slider>
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
    "demo-components-ha-round-slider": DemoHaRoundSlider;
  }
}
