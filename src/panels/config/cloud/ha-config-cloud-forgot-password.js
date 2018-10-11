import "@polymer/paper-card/paper-card.js";
import "@polymer/paper-input/paper-input.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../../components/buttons/ha-progress-button.js";
import "../../../layouts/hass-subpage.js";
import "../../../resources/ha-style.js";
import EventsMixin from "../../../mixins/events-mixin.js";

/*
 * @appliesMixin EventsMixin
 */
class HaConfigCloudForgotPassword extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="iron-flex ha-style">
      .content {
        padding-bottom: 24px;
      }

      paper-card {
        display: block;
        max-width: 600px;
        margin: 0 auto;
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
      .card-actions a {
        color: var(--primary-text-color);
      }
      [hidden] {
        display: none;
      }
    </style>
    <hass-subpage header="Forgot Password">
      <div class="content">
        <paper-card>
          <div class="card-content">
            <h1>Forgot your password?</h1>
            <p>
              Enter your email address and we will send you a link to reset your password.
            </p>
            <div class="error" hidden$="[[!_error]]">[[_error]]</div>
            <paper-input autofocus="" id="email" label="E-mail" value="{{email}}" type="email" on-keydown="_keyDown" error-message="Invalid email"></paper-input>
          </div>
          <div class="card-actions">
            <ha-progress-button on-click="_handleEmailPasswordReset" progress="[[_requestInProgress]]">Send reset email</ha-progress-button>
          </div>
        </paper-card>
      </div>
    </hass-subpage>
`;
  }

  static get properties() {
    return {
      hass: Object,
      email: {
        type: String,
        notify: true,
        observer: "_emailChanged",
      },
      _requestInProgress: {
        type: Boolean,
        value: false,
      },
      _error: {
        type: String,
        value: "",
      },
    };
  }

  _emailChanged() {
    this._error = "";
    this.$.email.invalid = false;
  }

  _keyDown(ev) {
    // validate on enter
    if (ev.keyCode === 13) {
      this._handleEmailPasswordReset();
      ev.preventDefault();
    }
  }

  _handleEmailPasswordReset() {
    if (!this.email || !this.email.includes("@")) {
      this.$.email.invalid = true;
    }

    if (this.$.email.invalid) return;

    this._requestInProgress = true;

    this.hass
      .callApi("post", "cloud/forgot_password", {
        email: this.email,
      })
      .then(
        () => {
          this._requestInProgress = false;
          this.fire("cloud-done", {
            flashMessage:
              "Check your email for instructions on how to reset your password.",
          });
        },
        (err) =>
          this.setProperties({
            _requestInProgress: false,
            _error:
              err && err.body && err.body.message
                ? err.body.message
                : "Unknown error",
          })
      );
  }
}

customElements.define(
  "ha-config-cloud-forgot-password",
  HaConfigCloudForgotPassword
);
