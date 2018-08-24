import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';

import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import computeStateName from '../../../../common/entity/compute_state_name.js';

import '../../../../components/ha-markdown.js';
import './hui-notification-item-template.js';

import LocalizeMixin from '../../../../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
export class HuiPersistentNotificationItem extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <hui-notification-item-template>
      <span slot="header">[[_computeTitle(stateObj)]]</span>
      
      <ha-markdown content="[[stateObj.attributes.message]]"></ha-markdown>
      
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
      stateObj: Object
    };
  }

  _handleDismiss() {
    this.hass.callApi('DELETE', `states/${this.stateObj.entity_id}`);
  }

  _computeTitle(stateObj) {
    return (stateObj.attributes.title || computeStateName(stateObj));
  }
}
customElements.define(
  'hui-persistent_notification-notification-item',
  HuiPersistentNotificationItem
);
