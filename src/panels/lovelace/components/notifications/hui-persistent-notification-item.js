import "@polymer/paper-button/paper-button";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-tooltip/paper-tooltip";

import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../../components/ha-relative-time";
import "../../../../components/ha-markdown";
import "./hui-notification-item-template";

import LocalizeMixin from "../../../../mixins/localize-mixin";

/*
 * @appliesMixin LocalizeMixin
 */
export class HuiPersistentNotificationItem extends LocalizeMixin(
  PolymerElement
) {
  static get template() {
    return html`
      <style>
        .time {
          display: flex;
          justify-content: flex-end;
          margin-top: 6px;
        }
        ha-relative-time {
          color: var(--secondary-text-color);
        }
      </style>
      <hui-notification-item-template>
        <span slot="header">[[_computeTitle(notification)]]</span>

        <ha-markdown content="[[notification.message]]"></ha-markdown>

        <div class="time">
          <span>
            <ha-relative-time
              hass="[[hass]]"
              datetime="[[notification.created_at]]"
            ></ha-relative-time>
            <paper-tooltip
              >[[_computeTooltip(hass, notification)]]</paper-tooltip
            >
          </span>
        </div>

        <paper-button slot="actions" class="primary" on-click="_handleDismiss"
          >[[localize('ui.card.persistent_notification.dismiss')]]</paper-button
        >
      </hui-notification-item-template>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      notification: Object,
    };
  }

  _handleDismiss() {
    this.hass.callService("persistent_notification", "dismiss", {
      notification_id: this.notification.notification_id,
    });
  }

  _computeTitle(notification) {
    return notification.title || notification.notification_id;
  }

  _computeTooltip(hass, notification) {
    if (!hass || !notification) return null;

    const d = new Date(notification.created_at);
    return d.toLocaleDateString(hass.language, {
      year: "numeric",
      month: "short",
      day: "numeric",
      minute: "numeric",
      hour: "numeric",
    });
  }
}
customElements.define(
  "hui-persistent_notification-notification-item",
  HuiPersistentNotificationItem
);
