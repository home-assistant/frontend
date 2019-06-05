import "@material/mwc-button";
import "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-spinner/paper-spinner";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "../../components/ha-card";

import LocalizeMixin from "../../mixins/localize-mixin";

import "../../resources/ha-style";

/*
 * @appliesMixin LocalizeMixin
 */
class HaChangePasswordCard extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="ha-style">
        .error {
          color: red;
        }
        .status {
          color: var(--primary-color);
        }
        .error,
        .status {
          position: absolute;
          top: -4px;
        }
        .currentPassword {
          margin-top: -4px;
        }
      </style>
      <div>
        <ha-card
          header="[[localize('ui.panel.profile.change_password.header')]]"
        >
          <div class="card-content">
            <template is="dom-if" if="[[_errorMsg]]">
              <div class="error">[[_errorMsg]]</div>
            </template>
            <template is="dom-if" if="[[_statusMsg]]">
              <div class="status">[[_statusMsg]]</div>
            </template>
            <paper-input
              class="currentPassword"
              label="[[localize('ui.panel.profile.change_password.current_password')]]"
              type="password"
              value="{{_currentPassword}}"
              required
              auto-validate
              error-message="[[localize('ui.panel.profile.change_password.error_required')]]"
            ></paper-input>
            <template is="dom-if" if="[[_currentPassword]]">
              <paper-input
                label="[[localize('ui.panel.profile.change_password.new_password')]]"
                type="password"
                value="{{_password1}}"
                required
                auto-validate
                error-message="[[localize('ui.panel.profile.change_password.error_required')]]"
              ></paper-input>
              <paper-input
                label="[[localize('ui.panel.profile.change_password.confirm_new_password')]]"
                type="password"
                value="{{_password2}}"
                required
                auto-validate
                error-message="[[localize('ui.panel.profile.change_password.error_required')]]"
              ></paper-input>
            </template>
          </div>
          <div class="card-actions">
            <template is="dom-if" if="[[_loading]]">
              <div><paper-spinner active></paper-spinner></div>
            </template>
            <template is="dom-if" if="[[!_loading]]">
              <mwc-button on-click="_changePassword"
                >[[localize('ui.panel.profile.change_password.submit')]]</mwc-button
              >
            </template>
          </div>
        </ha-card>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: Object,

      _loading: {
        type: Boolean,
        value: false,
      },

      // Error message when can't talk to server etc
      _statusMsg: String,
      _errorMsg: String,

      _currentPassword: String,
      _password1: String,
      _password2: String,
    };
  }

  ready() {
    super.ready();
    this.addEventListener("keypress", (ev) => {
      this._statusMsg = null;
      if (ev.keyCode === 13) {
        this._changePassword();
      }
    });
  }

  async _changePassword() {
    this._statusMsg = null;
    if (!this._currentPassword || !this._password1 || !this._password2) return;

    if (this._password1 !== this._password2) {
      this._errorMsg = "New password confirmation doesn't match";
      return;
    }

    if (this._currentPassword === this._password1) {
      this._errorMsg = "New password must be different than current password";
      return;
    }

    this._loading = true;
    this._errorMsg = null;

    try {
      await this.hass.callWS({
        type: "config/auth_provider/homeassistant/change_password",
        current_password: this._currentPassword,
        new_password: this._password1,
      });

      this.setProperties({
        _statusMsg: "Password changed successfully",
        _currentPassword: null,
        _password1: null,
        _password2: null,
      });
    } catch (err) {
      this._errorMsg = err.message;
    }

    this._loading = false;
  }
}

customElements.define("ha-change-password-card", HaChangePasswordCard);
