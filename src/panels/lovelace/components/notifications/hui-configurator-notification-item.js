import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';

import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import './hui-notification-item-template.js';

import EventsMixin from '../../../../mixins/events-mixin.js';
import LocalizeMixin from '../../../../mixins/localize-mixin.js';

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
export class HuiConfiguratorNotificationItem extends EventsMixin(LocalizeMixin(PolymerElement)) {
  static get template() {
    return html`
    <hui-notification-item-template>
      <span slot="header">[[localize('domain.configurator')]]</span>
      
      <div>[[_getMessage(stateObj)]]</div> 
      
      <paper-button 
        slot="actions" 
        class="primary" 
        on-click="_handleClick"
      >[[_localizeState(stateObj.state)]]</paper-button>
    </hui-notification-item-template>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: Object
    };
  }

  _handleClick() {
    this.fire('hass-more-info', { entityId: this.stateObj.entity_id });
  }

  _localizeState(state) {
    return this.localize(`state.configurator.${state}`);
  }

  _getMessage(stateObj) {
    const friendlyName = stateObj.attributes.friendly_name;
    return this.localize('ui.notification_drawer.click_to_configure', 'entity', friendlyName);
  }
}
customElements.define('hui-configurator-notification-item', HuiConfiguratorNotificationItem);
