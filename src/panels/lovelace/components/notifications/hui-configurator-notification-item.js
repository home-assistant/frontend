import "@material/mwc-button";
import "@polymer/paper-icon-button/paper-icon-button";

import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "./hui-notification-item-template";

import EventsMixin from "../../../../mixins/events-mixin";
import LocalizeMixin from "../../../../mixins/localize-mixin";

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
export class HuiConfiguratorNotificationItem extends EventsMixin(
  LocalizeMixin(PolymerElement)
) {
  static get template() {
    return html`
      <hui-notification-item-template>
        <span slot="header">[[localize('domain.configurator')]]</span>

        <div>[[_getMessage(notification)]]</div>

        <mwc-button slot="actions" on-click="_handleClick"
          >[[_localizeState(notification.state)]]</mwc-button
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

  _handleClick() {
    this.fire("hass-more-info", { entityId: this.notification.entity_id });
  }

  _localizeState(state) {
    return this.localize(`state.configurator.${state}`);
  }

  _getMessage(notification) {
    const friendlyName = notification.attributes.friendly_name;
    return this.localize(
      "ui.notification_drawer.click_to_configure",
      "entity",
      friendlyName
    );
  }
}
customElements.define(
  "hui-configurator-notification-item",
  HuiConfiguratorNotificationItem
);
