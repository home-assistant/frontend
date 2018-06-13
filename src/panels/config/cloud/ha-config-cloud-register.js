import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-input/paper-input.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/buttons/ha-progress-button.js';
import '../../../layouts/hass-subpage.js';
import '../../../resources/ha-style.js';
import '../ha-config-section.js';
import EventsMixin from '../../../mixins/events-mixin.js';

/*
 * @appliesMixin EventsMixin
 */
class HaConfigCloudRegister extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="iron-flex ha-style">
      a {
        color: var(--primary-color);
      }
      paper-card {
        display: block;
      }
      paper-item {
        cursor: pointer;
      }
      paper-card:last-child {
        margin-top: 24px;
      }
      h1 {
        @apply --paper-font-headline;
        margin: 0;
      }
      .error {
        color: var(--google-red-500);
      }
      .card-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      [hidden] {
        display: none;
      }
    </style>
    <hass-subpage header="Register Account">
      <div class="content">
        <ha-config-section is-wide="[[isWide]]">
          <span slot="header">Register with the Home Assistant Cloud</span>
          <span slot="introduction">
            Register today to easily connect with the Home Assistant Cloud. This will allow you to unlock great new services and functionality, like Amazon Alexa integration.

            <p>
              By registering an account you agree to the following terms and conditions.
              </p><ul>
                <li><a href="https://home-assistant.io/tos/" target="_blank">Terms and Conditions</a></li>
                <li><a href="https://home-assistant.io/privacy/" target="_blank">Privacy Policy</a></li>
              </ul>
            <p></p>
          </span>

          <paper-card>
            <div class="card-content">
              <div class="header">
                <h1>Register</h1>
                <div class="error" hidden$="[[!_error]]">[[_error]]</div>
              </div>
              <paper-input autofocus="" id="email" label="Email address" type="email" value="{{email}}" on-keydown="_keyDown" error-message="Invalid email"></paper-input>
              <paper-input id="password" label="Password" value="{{_password}}" type="password" on-keydown="_keyDown" error-message="Your password needs to be at least 8 characters"></paper-input>
            </div>
            <div class="card-actions">
              <ha-progress-button on-click="_handleRegister" progress="[[_requestInProgress]]">Create Account</ha-progress-button>
              <button class="link" hidden="[[_requestInProgress]]" on-click="_handleResendVerifyEmail">Resend confirmation email</button>
            </div>
          </paper-card>
        </ha-config-section>
      </div>
    </hass-subpage>
`;
  }

  static get properties() {
    return {
      hass: Object,
      isWide: Boolean,
      email: {
        type: String,
        notify: true,
      },

      _requestInProgress: {
        type: Boolean,
        value: false,
      },
      _password: {
        type: String,
        value: '',
      },
      _error: {
        type: String,
        value: '',
      },
    };
  }

  static get observers() {
    return [
      '_inputChanged(email, _password)'
    ];
  }

  _inputChanged() {
    this._error = '';
    this.$.email.invalid = false;
    this.$.password.invalid = false;
  }

  _keyDown(ev) {
    // validate on enter
    if (ev.keyCode === 13) {
      this._handleRegister();
      ev.preventDefault();
    }
  }

  _handleRegister() {
    let invalid = false;

    if (!this.email || !this.email.includes('@')) {
      this.$.email.invalid = true;
      this.$.email.focus();
      invalid = true;
    }

    if (this._password.length < 8) {
      this.$.password.invalid = true;

      if (!invalid) {
        invalid = true;
        this.$.password.focus();
      }
    }

    if (invalid) return;

    this._requestInProgress = true;

    this.hass.callApi('post', 'cloud/register', {
      email: this.email,
      password: this._password,
    }).then(() => this._verificationEmailSent(), (err) => {
      // Do this before setProperties because changing it clears errors.
      this._password = '';

      this.setProperties({
        _requestInProgress: false,
        _error: err && err.body && err.body.message ? err.body.message : 'Unknown error'
      });
    });
  }

  _handleResendVerifyEmail() {
    if (!this.email) {
      this.$.email.invalid = true;
      return;
    }

    this.hass.callApi('post', 'cloud/resend_confirm', {
      email: this.email,
    }).then(() => this._verificationEmailSent(), err => this.setProperties({
      _error: err && err.body && err.body.message ? err.body.message : 'Unknown error'
    }));
  }

  _verificationEmailSent() {
    this.setProperties({
      _requestInProgress: false,
      _password: '',
    });
    this.fire('cloud-done', {
      flashMessage: 'Account created! Check your email for instructions on how to activate your account.'
    });
  }
}

customElements.define('ha-config-cloud-register', HaConfigCloudRegister);
