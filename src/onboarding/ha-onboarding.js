import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/polymer/lib/elements/dom-if.js';
import '@polymer/polymer/lib/elements/dom-repeat.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-button/paper-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import hassCallApi from '../util/hass-call-api.js';

const callApi = (method, path, data) => hassCallApi('', {}, method, path, data);

class HaOnboarding extends PolymerElement {
  static get template() {
    return html`
    <style include="iron-flex iron-positioning"></style>
    <style>
      .content {
        padding: 20px 16px;
        max-width: 400px;
        margin: 0 auto;
      }

      .header {
        text-align: center;
        font-size: 1.96em;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 300;
      }

      .header img {
        margin-right: 16px;
      }

      h1 {
        font-size: 1.2em;
      }

      .error {
        color: red;
        font-weight: bold;
      }

      .action {
        margin: 32px 0;
        text-align: center;
      }
    </style>
    <div class="content layout vertical fit">
      <div class='header'>
        <img src="/static/icons/favicon-192x192.png" height="52">
        Home Assistant
      </div>

      <p>Are you ready to awaken your home, reclaim your privacy and join a worldwide community of tinkerers?</p>
      <p>Let's get started by creating a user account.</p>

      <template is='dom-if' if='[[_error]]'>
        <p class='error'>[[_error]]</p>
      </template>

      <paper-input
        autofocus
        label='Name'
        value='{{_name}}'
        required
        auto-validate
        error-message='Required'
        on-blur='_maybePopulateUsername'
      ></paper-input>

      <paper-input
        label='Username'
        value='{{_username}}'
        required
        auto-validate
        error-message='Required'
      ></paper-input>

      <paper-input
        label='Password'
        value='{{_password}}'
        required
        type='password'
        auto-validate
        error-message='Required'
      ></paper-input>

      <template is='dom-if' if='[[!_loading]]'>
        <p class='action'>
          <paper-button raised on-click='_submitForm'>Create Account</paper-button>
        </p>
      </template>
    </div>
`;
  }

  static get properties() {
    return {
      _name: String,
      _username: String,
      _password: String,
      _loading: {
        type: Boolean,
        value: false,
      }
    };
  }

  async ready() {
    super.ready();
    this.addEventListener('keypress', (ev) => {
      if (ev.keyCode === 13) {
        this._submitForm();
      }
    });
    const steps = await callApi('get', 'onboarding');
    if (steps.every(step => step.done)) {
      // Onboarding is done!
      document.location = '/';
    }
  }

  _maybePopulateUsername() {
    if (this._username) return;

    const parts = this._name.split(' ');

    if (parts.length) {
      this._username = parts[0].toLowerCase();
    }
  }

  async _submitForm() {
    if (!this._name || !this._username || !this._password) return;

    try {
      await callApi('post', 'onboarding/users', {
        name: this._name,
        username: this._username,
        password: this._password,
      });

      document.location = '/';
    } catch (err) {
      // eslint-disable-next-line
      console.error(err);
      this.setProperties({
        _loading: false,
        _error: err.message,
      });
    }
  }
}
customElements.define('ha-onboarding', HaOnboarding);
