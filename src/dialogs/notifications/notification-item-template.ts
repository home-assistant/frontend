import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
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

  static styles = css`
    .contents {
      padding: 16px;
      -ms-user-select: text;
      -webkit-user-select: text;
      -moz-user-select: text;
      user-select: text;
    }

    ha-card .header {
      font-family: var(--paper-font-headline_-_font-family);
      -webkit-font-smoothing: var(
        --paper-font-headline_-_-webkit-font-smoothing
      );
      font-size: var(--paper-font-headline_-_font-size);
      font-weight: var(--paper-font-headline_-_font-weight);
      letter-spacing: var(--paper-font-headline_-_letter-spacing);
      line-height: var(--paper-font-headline_-_line-height);

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

declare global {
  interface HTMLElementTagNameMap {
    "notification-item-template": HuiNotificationItemTemplate;
  }
}
