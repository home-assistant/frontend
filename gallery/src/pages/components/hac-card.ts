import { mdiFire } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";
import "../../../../src/components/ha-button";
import "../../../../src/components/ha-svg-icon";
import "@home-assistant/hac";

@customElement("demo-components-hac-card")
export class DemoHacCard extends LitElement {
  protected render() {
    return html`
      <div class="grid">
        <hac-card>
          <p>Content only.</p>
        </hac-card>

        <hac-card>
          <hac-header slot="header">Title</hac-header>
          <p>Card with a header.</p>
        </hac-card>

        <hac-card appearance="raised">
          <hac-header slot="header">
            <ha-svg-icon slot="icon" .path=${mdiFire}></ha-svg-icon>
            Gas
            <span slot="subtitle">Consumption and costs</span>
          </hac-header>
          <p>Raised card with header icon, subtitle and footer.</p>
          <ha-button slot="footer" appearance="plain">Cancel</ha-button>
          <ha-button slot="footer">Save</ha-button>
        </hac-card>
      </div>
    `;
  }

  static styles = css`
    .grid {
      display: grid;
      gap: var(--ha-space-4);
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      padding: var(--ha-space-4);
    }
    p {
      margin: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-hac-card": DemoHacCard;
  }
}
