import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';

import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import './hui-notification-item-template.js';

import EventsMixin from '../../../../mixins/events-mixin.js';

/*
 * @appliesMixin EventsMixin
 */
export class HuiConfiguratorNotificationItem extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <hui-notification-item-template>
      <span slot="header">Configurator</span>
      
      <div>Click button to configure [[entity.attributes.friendly_name]]</div> 
      
      <paper-button slot="actions" class="primary" on-click="_handleClick">Configure</paper-button>
    </hui-notification-item-template>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      entity: Object
    };
  }

  _handleClick() {
    this.fire('hass-more-info', { entityId: this.entity.entity_id });
  }
}
customElements.define('hui-configurator-notification-item', HuiConfiguratorNotificationItem);
