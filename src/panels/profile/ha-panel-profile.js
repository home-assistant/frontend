import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-item/paper-item";
import "@material/mwc-button";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../components/ha-card";
import "../../components/ha-menu-button";
import "../../resources/ha-style";

import { getOptimisticFrontendUserDataCollection } from "../../data/frontend";

import { EventsMixin } from "../../mixins/events-mixin";
import LocalizeMixin from "../../mixins/localize-mixin";

import "./ha-change-password-card";
import "./ha-mfa-modules-card";
import "./ha-advanced-mode-card";
import "./ha-refresh-tokens-card";
import "./ha-long-lived-access-tokens-card";

import "./ha-pick-language-row";
import "./ha-pick-theme-row";
import "./ha-push-notifications-row";
import "./ha-force-narrow-row";

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
            <ha-menu-button
              hass="[[hass]]"
              narrow="[[narrow]]"
            ></ha-menu-button>
            <div main-title>[[localize('panel.profile')]]</div>
          </app-toolbar>
        </app-header>

        <div class="content">
          <ha-card header="[[hass.user.name]]">
            <div class="card-content">
              [[localize('ui.panel.profile.current_user', 'fullName',
              hass.user.name)]]
              <template is="dom-if" if="[[hass.user.is_owner]]"
                >[[localize('ui.panel.profile.is_owner')]]</template
              >
            </div>

            <hello-world hass="[[hass]]"></hello-world>

            <ha-pick-language-row
              narrow="[[narrow]]"
              hass="[[hass]]"
            ></ha-pick-language-row>
            <ha-pick-theme-row
              narrow="[[narrow]]"
              hass="[[hass]]"
            ></ha-pick-theme-row>
            <template
              is="dom-if"
              if="[[_showNarrowRow(hass.dockedSidebar, narrow)]]"
            >
              <ha-force-narrow-row
                narrow="[[narrow]]"
                hass="[[hass]]"
              ></ha-force-narrow-row>
            </template>
            <ha-push-notifications-row
              narrow="[[narrow]]"
              hass="[[hass]]"
            ></ha-push-notifications-row>

            <div class="card-actions">
              <mwc-button class="warning" on-click="_handleLogOut"
                >[[localize('ui.panel.profile.logout')]]</mwc-button
              >
            </div>
          </ha-card>

          <template is="dom-if" if="[[_canChangePassword(hass.user)]]">
            <ha-change-password-card hass="[[hass]]"></ha-change-password-card>
          </template>

          <ha-mfa-modules-card
            hass="[[hass]]"
            mfa-modules="[[hass.user.mfa_modules]]"
          ></ha-mfa-modules-card>

          <template is="dom-if" if="[[_isAdmin(hass.user)]]">
            <ha-advanced-mode-card
              hass="[[hass]]"
              core-user-data="[[_coreUserData]]"
            ></ha-advanced-mode-card>
          </template>

          <ha-refresh-tokens-card
            hass="[[hass]]"
            refresh-tokens="[[_refreshTokens]]"
            on-hass-refresh-tokens="_refreshRefreshTokens"
          ></ha-refresh-tokens-card>

          <ha-long-lived-access-tokens-card
            hass="[[hass]]"
            refresh-tokens="[[_refreshTokens]]"
            on-hass-refresh-tokens="_refreshRefreshTokens"
          ></ha-long-lived-access-tokens-card>
        </div>
      </app-header-layout>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      narrow: Boolean,
      _refreshTokens: Array,
      _coreUserData: Object,
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._refreshRefreshTokens();
    this._unsubCoreData = getOptimisticFrontendUserDataCollection(
      this.hass.connection,
      "core"
    ).subscribe((coreUserData) => {
      this._coreUserData = coreUserData;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubCoreData) {
      this._unsubCoreData();
      this._unsubCoreData = undefined;
    }
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

  _isAdmin(user) {
    return user.is_admin;
  }

  _showNarrowRow(dockedSidebar, narrow) {
    return dockedSidebar === "auto" ? !narrow : true;
  }
}

customElements.define("ha-panel-profile", HaPanelProfile);
