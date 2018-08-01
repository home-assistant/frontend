import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';

import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../../components/ha-markdown.js';
import './hui-notification-item-template.js';

export class HuiPersistentNotificationItem extends PolymerElement {
  static get template() {
    return html`
    <hui-notification-item-template>
      <span slot="header">[[entity.attributes.title]]</span>
      
      <ha-markdown content="[[entity.attributes.message]]"></ha-markdown>
      
      <paper-button slot="actions" class="primary" on-click="_handleDismiss">Dismiss</paper-button>
    </hui-notification-item-template>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      entity: Object
    };
  }

  _handleDismiss() {
    this.hass.callApi('DELETE', `states/${this.entity.entity_id}`);
  }
}
customElements.define(
  'hui-persistent_notification-notification-item',
  HuiPersistentNotificationItem
);
