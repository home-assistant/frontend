import { PolymerElement } from "@polymer/polymer/polymer-element";
import computeDomain from "../../../../common/entity/compute_domain";

import "./hui-configurator-notification-item";
import "./hui-persistent-notification-item";

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
