import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';

import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../../components/ha-relative-time.js';
import '../../../../components/ha-markdown.js';
import './hui-notification-item-template.js';

import LocalizeMixin from '../../../../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
export class HuiPersistentNotificationItem extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      ha-relative-time {
        color: var(--secondary-text-color);
        display: block;
        margin-top: 6px;
        text-align: right;
      }
    </style>
    <hui-notification-item-template>
      <span slot="header">[[_computeTitle(notification)]]</span>
      
      <ha-markdown content="[[notification.message]]"></ha-markdown>
      
      <ha-relative-time
        hass="[[hass]]"
        datetime="[[notification.created_at]]"
      ></ha-relative-time>

      <paper-button
        slot="actions"
        class="primary"
        on-click="_handleDismiss"
      >[[localize('ui.card.persistent_notification.dismiss')]]</paper-button>
    </hui-notification-item-template>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      notification: Object
    };
  }

  _handleDismiss() {
    this.hass.callService('persistent_notification', 'dismiss', {
      notification_id: this.notification.notification_id
    });
  }

  _computeTitle(notification) {
    return notification.title || notification.notification_id;
  }
}
customElements.define(
  'hui-persistent_notification-notification-item',
  HuiPersistentNotificationItem
);
