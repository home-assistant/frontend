import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import "../../components/ha-card";

@customElement("notification-item-template")
export class HuiNotificationItemTemplate extends LitElement {
  protected render(): TemplateResult {
    return html`
      <ha-card>
        <div class="header"><slot name="header"></slot></div>
        <div class="contents"><slot></slot></div>
        <div class="actions"><slot name="actions"></slot></div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .contents {
        padding: 16px;
        -ms-user-select: text;
        -webkit-user-select: text;
        -moz-user-select: text;
        user-select: text;
      }

      ha-card .header {
        /* start paper-font-headline style */
        font-family: "Roboto", "Noto", sans-serif;
        -webkit-font-smoothing: antialiased; /* OS X subpixel AA bleed bug */
        text-rendering: optimizeLegibility;
        font-size: 24px;
        font-weight: 400;
        letter-spacing: -0.012em;
        line-height: 32px;
        /* end paper-font-headline style */

        color: var(--primary-text-color);
        padding: 16px 16px 0;
      }

      .actions {
        border-top: 1px solid var(--divider-color, #e8e8e8);
        padding: 5px 16px;
      }

      ::slotted(.primary) {
        color: var(--primary-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-item-template": HuiNotificationItemTemplate;
  }
}
