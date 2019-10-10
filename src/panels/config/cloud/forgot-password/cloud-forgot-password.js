import "@polymer/paper-input/paper-input";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../../components/ha-card";
import "../../../../components/buttons/ha-progress-button";
import "../../../../layouts/hass-subpage";
import "../../../../resources/ha-style";
import { EventsMixin } from "../../../../mixins/events-mixin";
import LocalizeMixin from "../../../../mixins/localize-mixin";
/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class CloudForgotPassword extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style include="iron-flex ha-style">
        .content {
          padding-bottom: 24px;
          direction: ltr;
        }

        ha-card {
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
      <hass-subpage header=[[localize('ui.panel.config.cloud.forgot_password.title')]]>
        <div class="content">
          <ha-card header=[[localize('ui.panel.config.cloud.forgot_password.subtitle')]]>
            <div class="card-content">
              <p>
                [[localize('ui.panel.config.cloud.forgot_password.instructions')]]
              </p>
              <div class="error" hidden$="[[!_error]]">[[_error]]</div>
              <paper-input
                autofocus=""
                id="email"
                label="[[localize('ui.panel.config.cloud.forgot_password.email')]]"
                value="{{email}}"
                type="email"
                on-keydown="_keyDown"
                error-message="[[localize('ui.panel.config.cloud.forgot_password.email_error_msg')]]"
              ></paper-input>
            </div>
            <div class="card-actions">
              <ha-progress-button
                on-click="_handleEmailPasswordReset"
                progress="[[_requestInProgress]]"
                >[[localize('ui.panel.config.cloud.forgot_password.send_reset_email')]]</ha-progress-button
              >
            </div>
          </ha-card>
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
              "[[localize('ui.panel.config.cloud.forgot_password.check_your_email')]]",
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

customElements.define("cloud-forgot-password", CloudForgotPassword);
