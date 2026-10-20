import { mdiFire } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../../src/components/ha-svg-icon";
import "@home-assistant/hac/button";
import "@home-assistant/hac/card";
import "@home-assistant/hac/header";

@customElement("demo-components-hac-card")
export class DemoHacCard extends LitElement {
  @state() private _closed = false;

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
          <hac-button slot="footer" appearance="plain">Cancel</hac-button>
          <hac-button slot="footer">Save</hac-button>
        </hac-card>

        ${
          this._closed
            ? nothing
            : html`<hac-card>
                <hac-header slot="header" show-close @hac-close=${this._close}>
                  Closable
                </hac-header>
                <p>Header with a close button. Click it to remove this card.</p>
              </hac-card>`
        }
      </div>
    `;
  }

  private _close() {
    this._closed = true;
  }

  static styles = css`
    .grid {
      display: grid;
      gap: var(--ha-space-4);
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      align-items: start;
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
