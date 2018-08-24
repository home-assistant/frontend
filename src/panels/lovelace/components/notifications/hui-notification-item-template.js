import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';

import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../../components/ha-card.js';

export class HuiNotificationItemTemplate extends PolymerElement {
  static get template() {
    return html`
    <style>
      .contents {
        padding: 16px;
      }
   
      ha-card .header {
        @apply --paper-font-headline;
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
    </style>
    <ha-card>
      <div class="header">
        <slot name="header"></slot>
      </div>
      <div class="contents">
        <slot></slot>
      </div>
      <div class="actions">
        <slot name="actions"></slot>
      </div>
    </ha-card>
    `;
  }
}
customElements.define('hui-notification-item-template', HuiNotificationItemTemplate);
