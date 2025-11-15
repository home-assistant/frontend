import { css, LitElement } from "lit";
import { customElement } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-marquee-text";

@customElement("demo-components-ha-marquee-text")
export class DemoHaMarqueeText extends LitElement {
  static styles = css`
    ha-card {
      max-width: 600px;
      margin: 24px auto;
    }
    .card-content {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-marquee-text": DemoHaMarqueeText;
  }
}
