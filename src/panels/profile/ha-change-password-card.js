import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-spinner/paper-spinner.js';
import '@polymer/paper-card/paper-card.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../resources/ha-style.js';

class HaChangePasswordCard extends PolymerElement {
  static get template() {
    return html`
    <style include="ha-style">
      .error {
        color: red;
      }
      .status {
        color: var(--primary-color);
      }
      .error, .status {
        position: absolute;
        top: -4px;
      }
      paper-card {
        display: block;
        max-width: 600px;
        margin: 16px auto;
      }
      .password1 {
        margin-top: -4px;
      }
    </style>
    <div>
      <paper-card heading="Change Password">
        <div class="card-content">
          <template is="dom-if" if="[[_errorMsg]]">
            <div class='error'>[[_errorMsg]]</div>
          </template>
          <template is="dom-if" if="[[_statusMsg]]">
            <div class="status">[[_statusMsg]]</div>
          </template>
          <paper-input
            autofocus
            class='password1'
            label='New Password'
            type='password'
            value='{{_password1}}'
            required
            auto-validate
            error-message='Required'
          ></paper-input>
          <paper-input
            label='Confirm New Password'
            type='password'
            value='{{_password2}}'
            required
            auto-validate
            error-message='Required'
          ></paper-input>
        </div>
        <div class="card-actions">
          <template is="dom-if" if="[[_loading]]">
            <div><paper-spinner active></paper-spinner></div>
          </template>
          <template is="dom-if" if="[[!_loading]]">
            <paper-button on-click="_changePassword">Submit</paper-button>
          </template>
        </div>
      </paper-card>
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

      _password1: String,
      _password2: String,
    };
  }

  ready() {
    super.ready();
    this.addEventListener('keypress', (ev) => {
      this._statusMsg = null;
      if (ev.keyCode === 13) {
        this._changePassword();
      }
    });
  }

  async _changePassword() {
    this._statusMsg = null;
    if (!this._password1 || !this._password2) return;

    if (this._password1 !== this._password2) {
      this._errorMsg = "Passwords don't match";
      return;
    }

    this._loading = true;
    this._errorMsg = null;

    try {
      await this.hass.callWS({
        type: 'config/auth_provider/homeassistant/change_password',
        new_password: this._password1,
      });

      this.setProperties({
        _statusMsg: 'Password changed successfully',
        _password1: null,
        _password2: null
      });
    } catch (err) {
      this._errorMsg = err.message;
      return;
    }

    this._loading = false;
  }
}

customElements.define('ha-change-password-card', HaChangePasswordCard);
