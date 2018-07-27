import '@polymer/app-layout/app-header-layout/app-header-layout.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../components/ha-menu-button.js';
import '../../resources/ha-style.js';
import './ha-change-password-card.js';

import EventsMixin from '../../mixins/events-mixin.js';

/*
 * @appliesMixin EventsMixin
 */
class HaPanelProfile extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="ha-style">
      :host {
        -ms-user-select: initial;
        -webkit-user-select: initial;
        -moz-user-select: initial;
      }

      paper-card {
        display: block;
        max-width: 600px;
        margin: 16px auto;
      }
    </style>

    <app-header-layout has-scrolling-region>
      <app-header slot="header" fixed>
        <app-toolbar>
          <ha-menu-button narrow='[[narrow]]' show-menu='[[showMenu]]'></ha-menu-button>
          <div main-title>Profile</div>
        </app-toolbar>
      </app-header>

      <div class='content'>
        <paper-card heading='[[hass.user.name]]'>
          <div class='card-content'>
            You are currently logged in as [[hass.user.name]].
            <template is='dom-if' if='[[hass.user.is_owner]]'>You are an owner.</template>
          </div>
          <div class='card-actions'>
            <paper-button
              class='warning'
              on-click='_handleLogOut'
            >Log out</paper-button>
          </div>
        </paper-card>
        <template is="dom-if" if="[[_canChangePassword(hass.user)]]">
          <ha-change-password-card hass="[[hass]]"></ha-change-password-card>
        </template>
      </div>
    </app-header-layout>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      narrow: Boolean,
      showMenu: Boolean,
    };
  }

  _handleLogOut() {
    this.fire('hass-logout');
  }

  _canChangePassword(user) {
    return user.credentials.some(cred => cred.auth_provider_type === 'homeassistant');
  }
}

customElements.define('ha-panel-profile', HaPanelProfile);
