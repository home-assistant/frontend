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
    <style>
      .error {
        color: red;
        font-weight: bold;
      }

      .action {
        margin: 32px 0;
        text-align: center;
      }
    </style>

    <template is='dom-if' if='[[_error]]'>
      <p class='error'>[[_error]]</p>
    </template>

    <form>
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
  </form>
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
    try {
      const response = await window.stepsPromise;
      const steps = await response.json();
      if (steps.every(step => step.done)) {
        // Onboarding is done!
        document.location = '/';
      }
    } catch (err) {
      debugger;
      if (err.status_code == 404) {
        // Onboarding is done when we don't load the component.
        document.location = '/';
        return;
      }
      alert('Something went wrong loading loading onboarding, try refreshing');
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
    if (!this._name || !this._username || !this._password) {
      this._error = 'Fill in all required fields';
      return;
    }

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
