import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-item/paper-item-body.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-ripple/paper-ripple.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/buttons/ha-progress-button.js';
import '../../../layouts/hass-subpage.js';
import '../../../resources/ha-style.js';

import '../ha-config-section.js';
import EventsMixin from '../../../mixins/events-mixin.js';
import NavigateMixin from '../../../mixins/navigate-mixin.js';

/*
 * @appliesMixin NavigateMixin
 * @appliesMixin EventsMixin
 */
class HaConfigCloudLogin extends
  NavigateMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
    <style include="iron-flex ha-style">
      .content {
        padding-bottom: 24px;
      }
      [slot=introduction] a {
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
      .flash-msg {
        padding-right: 44px;
      }
      .flash-msg paper-icon-button {
        position: absolute;
        top: 8px;
        right: 8px;
        color: var(--secondary-text-color);
      }
    </style>
    <hass-subpage header="Cloud Login">
      <div class="content">
        <ha-config-section is-wide="[[isWide]]">
          <span slot="header">Home Assistant Cloud</span>
          <span slot="introduction">
            The Home Assistant Cloud allows your local Home Assistant instance to connect with cloud-only services like Amazon Alexa.
            <p><a href="https://www.home-assistant.io/components/cloud/" target="_blank">Learn more</a></p>
          </span>

          <paper-card hidden\$="[[!flashMessage]]">
            <div class="card-content flash-msg">
              [[flashMessage]]
              <paper-icon-button icon="mdi:close" on-click="_dismissFlash">Dismiss</paper-icon-button>
              <paper-ripple id="flashRipple" noink=""></paper-ripple>
            </div>
          </paper-card>

          <paper-card>
            <div class="card-content">
              <h1>Sign In</h1>
              <div class="error" hidden\$="[[!_error]]">[[_error]]</div>
              <paper-input label="Email" id="email" type="email" value="{{email}}" on-keydown="_keyDown" error-message="Invalid email"></paper-input>
              <paper-input id="password" label="Password" value="{{_password}}" type="password" on-keydown="_keyDown" error-message="Passwords are at least 8 characters"></paper-input>
            </div>
            <div class="card-actions">
              <ha-progress-button on-click="_handleLogin" progress="[[_requestInProgress]]">Sign in</ha-progress-button>
              <button class="link" hidden="[[_requestInProgress]]" on-click="_handleForgotPassword">forgot password?</button>
            </div>
          </paper-card>

          <paper-card>
            <paper-item on-click="_handleRegister">
              <paper-item-body two-line="">
                Create Account
                <div secondary="">Get up and running quickly.</div>
              </paper-item-body>
              <iron-icon icon="mdi:chevron-right"></iron-icon>
            </paper-item>
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
      _password: {
        type: String,
        value: '',
      },
      _requestInProgress: {
        type: Boolean,
        value: false,
      },
      flashMessage: {
        type: String,
        notify: true,
      },
      _error: String,
    };
  }

  static get observers() {
    return [
      '_inputChanged(email, _password)'
    ];
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.flashMessage) {
      // Wait for DOM to be drawn
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          this.$.flashRipple.simulatedRipple()));
    }
  }

  _inputChanged() {
    this.$.email.invalid = false;
    this.$.password.invalid = false;
    this._error = false;
  }

  _keyDown(ev) {
    // validate on enter
    if (ev.keyCode === 13) {
      this._handleLogin();
      ev.preventDefault();
    }
  }

  _handleLogin() {
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

    this.hass.callApi('post', 'cloud/login', {
      email: this.email,
      password: this._password,
    }).then((account) => {
      this.fire('ha-account-refreshed', { account: account });
      this.setProperties({
        email: '',
        _password: '',
      });
    }, (err) => {
      // Do this before setProperties because changing it clears errors.
      this._password = '';

      const errCode = err && err.body && err.body.code;
      if (errCode === 'PasswordChangeRequired') {
        alert('You need to change your password before logging in.');
        this.navigate('/config/cloud/forgot-password');
        return;
      }

      const props = {
        _requestInProgress: false,
        _error: (err && err.body && err.body.message) ? err.body.message : 'Unknown error',
      };

      if (errCode === 'UserNotConfirmed') {
        props._error = 'You need to confirm your email before logging in.';
      }

      this.setProperties(props);
      this.$.email.focus();
    });
  }

  _handleRegister() {
    this.flashMessage = '';
    this.navigate('/config/cloud/register');
  }

  _handleForgotPassword() {
    this.flashMessage = '';
    this.navigate('/config/cloud/forgot-password');
  }

  _dismissFlash() {
    // give some time to let the ripple finish.
    setTimeout(() => { this.flashMessage = ''; }, 200);
  }
}

customElements.define('ha-config-cloud-login', HaConfigCloudLogin);
