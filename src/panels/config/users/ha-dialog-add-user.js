import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-spinner/paper-spinner.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../resources/ha-style.js';

import LocalizeMixin from '../../../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class HaDialogAddUser extends LocalizeMixin(PolymerElement) {
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
      <h2>Add user</h2>
      <div>
        <template is="dom-if" if="[[_errorMsg]]">
          <div class='error'>[[_errorMsg]]</div>
        </template>
        <paper-input
          class='name'
          label='Name'
          value='{{_name}}'
          required
          auto-validate
          error-message='Required'
          on-blur='_maybePopulateUsername'
        ></paper-input>
        <paper-input
          class='username'
          label='Username'
          value='{{_username}}'
          required
          auto-validate
          error-message='Required'
        ></paper-input>
        <paper-input
          label='Password'
          type='password'
          value='{{_password}}'
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
          <paper-button on-click="_createUser">Create</paper-button>
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

      _name: String,
      _username: String,
      _password: String,
    };
  }

  ready() {
    super.ready();
    this.addEventListener('keypress', (ev) => {
      if (ev.keyCode === 13) {
        this._createUser();
      }
    });
  }

  showDialog({ hass, dialogClosedCallback }) {
    this.hass = hass;
    this._dialogClosedCallback = dialogClosedCallback;
    this._loading = false;
    this._opened = true;
    setTimeout(() => this.shadowRoot.querySelector('paper-input').focus(), 0);
  }

  _maybePopulateUsername() {
    if (this._username) return;

    const parts = this._name.split(' ');

    if (parts.length) {
      this._username = parts[0].toLowerCase();
    }
  }

  async _createUser() {
    if (!this._name || !this._username || !this._password) return;

    this._loading = true;
    this._errorMsg = null;

    let userId;

    try {
      const userResponse = await this.hass.callWS({
        type: 'config/auth/create',
        name: this._name,
      });
      userId = userResponse.user.id;
    } catch (err) {
      this._loading = false;
      this._errorMsg = err.code;
      return;
    }

    try {
      await this.hass.callWS({
        type: 'config/auth_provider/homeassistant/create',
        user_id: userId,
        username: this._username,
        password: this._password,
      });
    } catch (err) {
      this._loading = false;
      this._errorMsg = err.code;
      await this.hass.callWS({
        type: 'config/auth/delete',
        user_id: userId,
      });
      return;
    }

    this._dialogDone(userId);
  }

  _dialogDone(userId) {
    this._dialogClosedCallback({ userId });

    this.setProperties({
      _errorMsg: null,
      _username: '',
      _password: '',
      _dialogClosedCallback: null,
      _opened: false,
    });
  }

  _equals(a, b) {
    return a === b;
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

customElements.define('ha-dialog-add-user', HaDialogAddUser);
