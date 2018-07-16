import '@polymer/app-layout/app-header-layout/app-header-layout.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/ha-menu-button.js';

import '../ha-config-section.js';
import './ha-config-cloud-menu.js';
import './ha-config-entries-menu.js';
import './ha-config-users-menu.js';
import './ha-config-navigation.js';

import isComponentLoaded from '../../../common/config/is_component_loaded.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class HaConfigDashboard extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="iron-flex ha-style">
      .content {
        padding-bottom: 32px;
      }
    </style>

    <app-header-layout has-scrolling-region="">
      <app-header slot="header" fixed="">
        <app-toolbar>
          <ha-menu-button narrow="[[narrow]]" show-menu="[[showMenu]]"></ha-menu-button>
          <div main-title="">[[localize('panel.configuration')]]</div>
        </app-toolbar>
      </app-header>

      <div class="content">
        <ha-config-section is-wide="[[isWide]]">
          <span slot="header">[[localize('ui.panel.config.header')]]</span>
          <span slot="introduction">[[localize('ui.panel.config.introduction')]]</span>

          <template is="dom-if" if="[[computeIsLoaded(hass, 'cloud')]]">
            <ha-config-cloud-menu hass="[[hass]]" account="[[account]]"></ha-config-cloud-menu>
          </template>

          <template is="dom-if" if="[[computeIsLoaded(hass, 'config.config_entries')]]">
            <ha-config-entries-menu hass="[[hass]]"></ha-config-entries-menu>
          </template>

          <template is="dom-if" if="[[hass.user.is_owner]]">
            <ha-config-users-menu hass="[[hass]]"></ha-config-users-menu>
          </template>

          <ha-config-navigation hass="[[hass]]"></ha-config-navigation>
        </ha-config-section>
      </div>
    </app-header-layout>
`;
  }

  static get properties() {
    return {
      hass: Object,
      isWide: Boolean,
      account: Object,
      narrow: Boolean,
      showMenu: Boolean,
    };
  }

  computeIsLoaded(hass, component) {
    return isComponentLoaded(hass, component);
  }
}

customElements.define('ha-config-dashboard', HaConfigDashboard);
