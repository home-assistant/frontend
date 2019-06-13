import "@polymer/paper-input/paper-input";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../../components/ha-card";
import "../../../../components/buttons/ha-progress-button";
import "../../../../layouts/hass-subpage";
import "../../../../resources/ha-style";
import "../../ha-config-section";
import { EventsMixin } from "../../../../mixins/events-mixin";

/*
 * @appliesMixin EventsMixin
 */
class CloudRegister extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="iron-flex ha-style">
      .content {
        direction: ltr;
      }

      [slot=introduction] {
        margin: -1em 0;
      }
      [slot=introduction] a {
        color: var(--primary-color);
      }
      a {
        color: var(--primary-color);
      }
      paper-item {
        cursor: pointer;
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
          <span slot="header">Start your free trial</span>
          <div slot="introduction">
            <p>
              Create an account to start your free one month trial with Home Assistant Cloud. No payment information necessary.
            </p>
            <p>
              The trial will give you access to all the benefits of Home Assistant Cloud, including:
            </p>
            <ul>
              <li>Control of Home Assistant away from home</li>
              <li>Integration with Google Assistant</li>
              <li>Integration with Amazon Alexa</li>
              <li>Easy integration with webhook-based apps like OwnTracks</li>
            </ul>
            <p>
              This service is run by our partner <a href='https://www.nabucasa.com' target='_blank'>Nabu&nbsp;Casa,&nbsp;Inc</a>, a company founded by the founders of Home Assistant and Hass.io.
            </p>

            <p>
              By registering an account you agree to the following terms and conditions.
              </p><ul>
                <li><a href="https://home-assistant.io/tos/" target="_blank">Terms and Conditions</a></li>
                <li><a href="https://home-assistant.io/privacy/" target="_blank">Privacy Policy</a></li>
              </ul>
            </p>
          </div>

          <ha-card header="Create Account">
            <div class="card-content">
              <div class="header">
                <div class="error" hidden$="[[!_error]]">[[_error]]</div>
              </div>
              <paper-input autofocus="" id="email" label="Email address" type="email" value="{{email}}" on-keydown="_keyDown" error-message="Invalid email"></paper-input>
              <paper-input id="password" label="Password" value="{{_password}}" type="password" on-keydown="_keyDown" error-message="Your password needs to be at least 8 characters"></paper-input>
            </div>
            <div class="card-actions">
              <ha-progress-button on-click="_handleRegister" progress="[[_requestInProgress]]">Start trial</ha-progress-button>
              <button class="link" hidden="[[_requestInProgress]]" on-click="_handleResendVerifyEmail">Resend confirmation email</button>
            </div>
          </ha-card>
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
        value: "",
      },
      _error: {
        type: String,
        value: "",
      },
    };
  }

  static get observers() {
    return ["_inputChanged(email, _password)"];
  }

  _inputChanged() {
    this._error = "";
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

    if (!this.email || !this.email.includes("@")) {
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

    this.hass
      .callApi("post", "cloud/register", {
        email: this.email,
        password: this._password,
      })
      .then(
        () => this._verificationEmailSent(),
        (err) => {
          // Do this before setProperties because changing it clears errors.
          this._password = "";

          this.setProperties({
            _requestInProgress: false,
            _error:
              err && err.body && err.body.message
                ? err.body.message
                : "Unknown error",
          });
        }
      );
  }

  _handleResendVerifyEmail() {
    if (!this.email) {
      this.$.email.invalid = true;
      return;
    }

    this.hass
      .callApi("post", "cloud/resend_confirm", {
        email: this.email,
      })
      .then(
        () => this._verificationEmailSent(),
        (err) =>
          this.setProperties({
            _error:
              err && err.body && err.body.message
                ? err.body.message
                : "Unknown error",
          })
      );
  }

  _verificationEmailSent() {
    this.setProperties({
      _requestInProgress: false,
      _password: "",
    });
    this.fire("cloud-done", {
      flashMessage:
        "Account created! Check your email for instructions on how to activate your account.",
    });
  }
}

customElements.define("cloud-register", CloudRegister);
