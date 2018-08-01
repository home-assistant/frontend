import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import computeDomain from '../../../../common/entity/compute_domain.js';

import './hui-configurator-notification-item.js';
import './hui-persistent-notification-item.js';

export class HuiNotificationItem extends PolymerElement {
  static get properties() {
    return {
      hass: Object,
      entity: {
        type: Object,
        observer: '_entityChanged'
      }
    };
  }

  _entityChanged(entity) {
    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    if (!this.entity) return;

    const domain = computeDomain(entity.entity_id);
    const tag = `hui-${domain}-notification-item`;
    const el = document.createElement(tag);
    el.hass = this.hass;
    el.entity = entity;
    this.appendChild(el);
  }
}
customElements.define('hui-notification-item', HuiNotificationItem);
