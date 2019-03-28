import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  css,
  CSSResult,
} from "lit-element";

import "../../../../components/ha-card";

@customElement("hui-notification-item-template")
export class HuiNotificationItemTemplate extends LitElement {
  protected render(): TemplateResult | void {
    // @apply: https://github.com/Polymer/lit-element/issues/633#issuecomment-475983474
    return html`
      <style>
        ha-card .header {
          @apply --paper-font-headline;
        }
      </style>
      <ha-card>
        <div class="header"><slot name="header"></slot></div>
        <div class="contents"><slot></slot></div>
        <div class="actions"><slot name="actions"></slot></div>
      </ha-card>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .contents {
        padding: 16px;
      }

      ha-card .header {
        color: var(--primary-text-color);
        padding: 16px 16px 0;
      }

      .actions {
        border-top: 1px solid #e8e8e8;
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
    "hui-notification-item-template": HuiNotificationItemTemplate;
  }
}
