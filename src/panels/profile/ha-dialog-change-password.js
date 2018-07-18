import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-spinner/paper-spinner.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../resources/ha-style.js';

import LocalizeMixin from '../../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class HaDialogChangePassword extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="ha-style-dialog">
      .error {
        color: red;
      }
      paper-dialog {
        max-width: 500px;
      }
      .username {
        margin-top: -8px;
      }
    </style>
    <paper-dialog id="dialog" with-backdrop opened="{{_opened}}" on-opened-changed="_openedChanged">
      <h2>Change Password</h2>
      <div>
        <template is="dom-if" if="[[_errorMsg]]">
          <div class='error'>[[_errorMsg]]</div>
        </template>
        <paper-input
          autofocus
          class='currentPassword'
          label='Current Password'
          type='password'
          value='{{_currentPassword}}'
          required
          auto-validate
          error-message='Required'
        ></paper-input>
        <paper-input
          label='New Password'
          type='password'
          value='{{_newPassword}}'
          required
          auto-validate
          error-message='Required'
        ></paper-input>
      </div>
      <div class="buttons">
        <template is="dom-if" if="[[_loading]]">
          <div class='submit-spinner'><paper-spinner active></paper-spinner></div>
        </template>
        <template is="dom-if" if="[[!_loading]]">
          <paper-button on-click="_changePassword">Submit</paper-button>
        </template>
      </div>
    </paper-dialog>
`;
  }

  static get properties() {
    return {
      _hass: Object,
      _dialogClosedCallback: Function,

      _loading: {
        type: Boolean,
        value: false,
      },

      // Error message when can't talk to server etc
      _errorMsg: String,

      _opened: {
        type: Boolean,
        value: false,
      },

      _currentPassword: String,
      _newPassword: String,
    };
  }

  ready() {
    super.ready();
    this.addEventListener('keypress', (ev) => {
      if (ev.keyCode === 13) {
        this._changePassword();
      }
    });
  }

  showDialog({ hass, dialogClosedCallback }) {
    this.hass = hass;
    this._dialogClosedCallback = dialogClosedCallback;
    this._loading = false;
    this._opened = true;
  }

  async _changePassword() {
    if (!this._currentPassword || !this._newPassword) return;

    if (this._currentPassword === this._newPassword) {
      this._errorMsg = 'Passwords must be different';
      return;
    }

    this._loading = true;
    this._errorMsg = null;

    try {
      await this.hass.callWS({
        type: 'config/auth_provider/homeassistant/change_password',
        current_password: this._currentPassword,
        new_password: this._newPassword,
      });
    } catch (err) {
      this._loading = false;
      this._errorMsg = err.message;
      return;
    }

    this._dialogDone();
  }

  _dialogDone() {
    this._dialogClosedCallback();

    this.setProperties({
      _errorMsg: null,
      _currentPassword: '',
      _newPassword: '',
      _dialogClosedCallback: null,
      _opened: false,
    });
  }

  _openedChanged(ev) {
    // Closed dialog by clicking on the overlay
    // Check against dialogClosedCallback to make sure we didn't change
    // programmatically
    if (this._dialogClosedCallback && !ev.detail.value) {
      this._dialogDone();
    }
  }
}

customElements.define('ha-dialog-change-password', HaDialogChangePassword);
