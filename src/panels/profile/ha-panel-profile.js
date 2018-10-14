import "@polymer/app-layout/app-header-layout/app-header-layout.js";
import "@polymer/app-layout/app-header/app-header.js";
import "@polymer/paper-card/paper-card.js";
import "@polymer/paper-item/paper-item-body.js";
import "@polymer/paper-item/paper-item.js";
import "@polymer/paper-button/paper-button.js";
import "@polymer/app-layout/app-toolbar/app-toolbar.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../components/ha-menu-button.js";
import "../../resources/ha-style.js";

import EventsMixin from "../../mixins/events-mixin.js";
import LocalizeMixin from "../../mixins/localize-mixin.js";

import "./ha-change-password-card.js";
import "./ha-mfa-modules-card.js";
import "./ha-refresh-tokens-card.js";
import "./ha-long-lived-access-tokens-card.js";

import "./ha-pick-language-row.js";
import "./ha-pick-theme-row.js";
import "./ha-push-notifications-row.js";

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class HaPanelProfile extends EventsMixin(LocalizeMixin(PolymerElement)) {
  static get template() {
    return html`
    <style include="ha-style">
      :host {
        -ms-user-select: initial;
        -webkit-user-select: initial;
        -moz-user-select: initial;
      }

      .content {
        display: block;
        max-width: 600px;
        margin: 0 auto;
      }

      .content > * {
        display: block;
        margin: 24px 0;
      }
    </style>

    <app-header-layout has-scrolling-region>
      <app-header slot="header" fixed>
        <app-toolbar>
          <ha-menu-button narrow='[[narrow]]' show-menu='[[showMenu]]'></ha-menu-button>
          <div main-title>[[localize('panel.profile')]]</div>
        </app-toolbar>
      </app-header>

      <div class='content'>
        <paper-card heading='[[hass.user.name]]'>
          <div class='card-content'>
            [[localize('ui.panel.profile.current_user', 'fullName', hass.user.name)]]
            <template is='dom-if' if='[[hass.user.is_owner]]'>[[localize('ui.panel.profile.is_owner')]]</template>
          </div>

          <hello-world hass='[[hass]]'></hello-world>

          <ha-pick-language-row
            narrow="[[narrow]]"
            hass="[[hass]]"
          ></ha-pick-language-row>
          <ha-pick-theme-row
            narrow="[[narrow]]"
            hass="[[hass]]"
          ></ha-pick-theme-row>
          <ha-push-notifications-row
            narrow="[[narrow]]"
            hass="[[hass]]"
          ></ha-push-notifications-row>

          <div class='card-actions'>
            <paper-button
              class='warning'
              on-click='_handleLogOut'
            >[[localize('ui.panel.profile.logout')]]</paper-button>
          </div>
        </paper-card>

        <template is="dom-if" if="[[_canChangePassword(hass.user)]]">
          <ha-change-password-card hass="[[hass]]"></ha-change-password-card>
        </template>

        <ha-mfa-modules-card
          hass='[[hass]]'
          mfa-modules='[[hass.user.mfa_modules]]'
        ></ha-mfa-modules-card>

        <ha-refresh-tokens-card
          hass='[[hass]]'
          refresh-tokens='[[_refreshTokens]]'
          on-hass-refresh-tokens='_refreshRefreshTokens'
        ></ha-refresh-tokens-card>

        <ha-long-lived-access-tokens-card
          hass='[[hass]]'
          refresh-tokens='[[_refreshTokens]]'
          on-hass-refresh-tokens='_refreshRefreshTokens'
        ></ha-long-lived-access-tokens-card>
      </div>
    </app-header-layout>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      narrow: Boolean,
      showMenu: Boolean,
      _refreshTokens: Array,
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._refreshRefreshTokens();
  }

  async _refreshRefreshTokens() {
    this._refreshTokens = await this.hass.callWS({
      type: "auth/refresh_tokens",
    });
  }

  _handleLogOut() {
    this.fire("hass-logout");
  }

  _canChangePassword(user) {
    return user.credentials.some(
      (cred) => cred.auth_provider_type === "homeassistant"
    );
  }
}

customElements.define("ha-panel-profile", HaPanelProfile);
