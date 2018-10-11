import { PolymerElement } from "@polymer/polymer/polymer-element.js";
import computeDomain from "../../../../common/entity/compute_domain.js";

import "./hui-configurator-notification-item.js";
import "./hui-persistent-notification-item.js";

export class HuiNotificationItem extends PolymerElement {
  static get properties() {
    return {
      hass: Object,
      notification: {
        type: Object,
        observer: "_stateChanged",
      },
    };
  }

  _stateChanged(notification) {
    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    if (!notification) return;

    const domain = notification.entity_id
      ? computeDomain(notification.entity_id)
      : "persistent_notification";
    const tag = `hui-${domain}-notification-item`;
    const el = document.createElement(tag);
    el.hass = this.hass;
    el.notification = notification;
    this.appendChild(el);
  }
}
customElements.define("hui-notification-item", HuiNotificationItem);
