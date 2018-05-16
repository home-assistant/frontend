import '@polymer/app-layout/app-header-layout/app-header-layout.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../src/components/ha-menu-button.js';
import '../../../src/util/hass-mixins.js';
import '../ha-config-section.js';
import './ha-config-cloud-menu.js';
import './ha-config-entries-menu.js';
import './ha-config-navigation.js';

/*
 * @appliesMixin window.hassMixins.LocalizeMixin
 */
class HaConfigDashboard extends window.hassMixins.LocalizeMixin(PolymerElement) {
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

          <template is="dom-if" if="[[computeIsLoaded(hass, &quot;cloud&quot;)]]">
            <ha-config-cloud-menu hass="[[hass]]" account="[[account]]"></ha-config-cloud-menu>
          </template>

          <template is="dom-if" if="[[computeIsLoaded(hass, &quot;config.config_entries&quot;)]]">
            <ha-config-entries-menu hass="[[hass]]"></ha-config-entries-menu>
          </template>

          <ha-config-navigation hass="[[hass]]"></ha-config-navigation>
        </ha-config-section>
      </div>
    </app-header-layout>
`;
  }

  static get is() { return 'ha-config-dashboard'; }

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
    return window.hassUtil.isComponentLoaded(hass, component);
  }
}

customElements.define(HaConfigDashboard.is, HaConfigDashboard);
