import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-item/paper-item";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/ha-card";
import "../../../components/ha-menu-button";
import "../../../components/ha-icon-next";

import "../ha-config-section";
import "./ha-config-navigation";

import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import LocalizeMixin from "../../../mixins/localize-mixin";
import NavigateMixin from "../../../mixins/navigate-mixin";

/*
 * @appliesMixin LocalizeMixin
 */
class HaConfigDashboard extends NavigateMixin(LocalizeMixin(PolymerElement)) {
  static get template() {
    return html`
    <style include="iron-flex ha-style">
      ha-card {
        overflow: hidden;
      }
      .content {
        padding-bottom: 32px;
      }
      ha-card a {
        text-decoration: none;
        color: var(--primary-text-color);
      }
      .promo-advanced {
        text-align: center;
        color: var(--secondary-text-color);
      }
      .promo-advanced a {
        color: var(--secondary-text-color);
      }
    </style>

    <app-header-layout has-scrolling-region="">
      <app-header slot="header" fixed="">
        <app-toolbar>
          <ha-menu-button hass='[[hass]]' narrow='[[narrow]]'></ha-menu-button>
          <div main-title="">[[localize('panel.config')]]</div>
        </app-toolbar>
      </app-header>

      <div class="content">
        <ha-config-section is-wide="[[isWide]]">
          <span slot="header">[[localize('ui.panel.config.header')]]</span>
          <span slot="introduction">[[localize('ui.panel.config.introduction')]]</span>

          <template is="dom-if" if="[[computeIsLoaded(hass, 'cloud')]]">
            <ha-card>
              <a href='/config/cloud' tabindex="-1">
                <paper-item>
                  <paper-item-body two-line="">
                    [[localize('ui.panel.config.cloud.caption')]]
                    <template is="dom-if" if="[[cloudStatus.logged_in]]">
                      <div secondary="">
                        [[localize('ui.panel.config.cloud.description_login', 'email', cloudStatus.email)]]
                      </div>
                    </template>
                    <template is="dom-if" if="[[!cloudStatus.logged_in]]">
                      <div secondary="">
                        [[localize('ui.panel.config.cloud.description_features')]]
                      </div>
                    </template>
                  </paper-item-body>
                  <ha-icon-next></ha-icon-next>
                </paper-item>
              </ha-card>
            </a>
          </template>

          <ha-card>
            <a href='/config/integrations/dashboard' tabindex="-1">
              <paper-item>
                <paper-item-body two-line>
                  [[localize('ui.panel.config.integrations.caption')]]
                  <div secondary>
                    [[localize('ui.panel.config.integrations.description')]]
                  </div>
                </paper-item-body>
                <ha-icon-next></ha-icon-next>
              </paper-item>
            </a>
            <a href='/config/devices/dashboard' tabindex="-1">
              <paper-item>
                <paper-item-body two-line>
                  [[localize('ui.panel.config.devices.caption')]]
                  <div secondary>
                    [[localize('ui.panel.config.devices.description')]]
                  </div>
                </paper-item-body>
                <ha-icon-next></ha-icon-next>
              </paper-item>
            </a>

            <a href='/config/users' tabindex="-1">
              <paper-item>
                <paper-item-body two-line>
                  [[localize('ui.panel.config.users.caption')]]
                  <div secondary>
                    [[localize('ui.panel.config.users.description')]]
                  </div>
                </paper-item-body>
                <ha-icon-next></ha-icon-next>
              </paper-item>
            </a>
          </ha-card>

          <ha-config-navigation
            hass="[[hass]]"
            show-advanced="[[showAdvanced]]"
          ></ha-config-navigation>

          <template is='dom-if' if='[[!showAdvanced]]'>
            <div class='promo-advanced'>
              Missing config options? Enable advanced mode on <a href="/profile">your profile page.</a>
            </div>
          </template>
        </ha-config-section>
      </div>
    </app-header-layout>
`;
  }

  static get properties() {
    return {
      hass: Object,
      narrow: Boolean,
      isWide: Boolean,
      cloudStatus: Object,
      showAdvanced: Boolean,
    };
  }

  computeIsLoaded(hass, component) {
    return isComponentLoaded(hass, component);
  }
}

customElements.define("ha-config-dashboard", HaConfigDashboard);
