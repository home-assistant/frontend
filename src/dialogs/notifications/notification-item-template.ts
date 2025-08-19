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
      font-family: var(--ha-font-family-body);
      -webkit-font-smoothing: var(--ha-font-smoothing);
      -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
      font-size: var(--ha-font-size-2xl);
      font-weight: var(--ha-font-weight-normal);
      line-height: var(--ha-line-height-condensed);

      color: var(--primary-text-color);
      padding: 16px 16px 0;
    }

    .actions {
      border-top: 1px solid var(--divider-color, #e8e8e8);
      padding: 8px;
      display: flex;
      justify-content: flex-end;
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
