import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';

import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import computeNotifications from '../../common/compute-notifications.js';

import EventsMixin from '../../../../mixins/events-mixin.js';

/*
 * @appliesMixin EventsMixin
 */
export class HuiNotificationsButton extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      :host {
        position: relative;
      }
 
      .indicator {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--accent-color);
        pointer-events: none;
      }

      .indicator[hidden] {
        display: none;
      }
    </style>
    <paper-icon-button icon="hass:bell" on-click="_clicked"></paper-icon-button>
    <span class="indicator" hidden$="[[!_hasNotifications(hass.states)]]"></span>
    `;
  }

  static get properties() {
    return {
      hass: Object
    };
  }

  _clicked() {
    this.fire('open-notification-drawer');
  }

  _hasNotifications(states) {
    return computeNotifications(states).length > 0;
  }
}
customElements.define('hui-notifications-button', HuiNotificationsButton);
