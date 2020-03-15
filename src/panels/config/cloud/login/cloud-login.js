import "@material/mwc-button";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-ripple/paper-ripple";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../../components/ha-card";
import "../../../../components/buttons/ha-progress-button";
import "../../../../layouts/hass-subpage";
import "../../../../resources/ha-style";

import "../../ha-config-section";
import { EventsMixin } from "../../../../mixins/events-mixin";
import NavigateMixin from "../../../../mixins/navigate-mixin";
import "../../../../components/ha-icon-next";
import LocalizeMixin from "../../../../mixins/localize-mixin";
/*
 * @appliesMixin NavigateMixin
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class CloudLogin extends LocalizeMixin(
  NavigateMixin(EventsMixin(PolymerElement))
) {
  static get template() {
    return html`
      <style include="iron-flex ha-style">
        .content {
          padding-bottom: 24px;
          direction: ltr;
        }
        [slot="introduction"] {
          margin: -1em 0;
        }
        [slot="introduction"] a {
          color: var(--primary-color);
        }
        paper-item {
          cursor: pointer;
        }
        ha-card {
          overflow: hidden;
        }
        ha-card .card-header {
          margin-bottom: -8px;
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
      <hass-subpage header="[[localize('ui.panel.config.cloud.caption')]]">
        <div class="content">
          <ha-config-section is-wide="[[isWide]]">
            <span slot="header"
              >[[localize('ui.panel.config.cloud.caption')]]</span
            >
            <div slot="introduction">
              <p>
                [[localize('ui.panel.config.cloud.login.introduction')]]
              </p>
              <p>
                [[localize('ui.panel.config.cloud.login.introduction2')]]
                <a
                  href="https://www.nabucasa.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  Nabu&nbsp;Casa,&nbsp;Inc
                </a>
                [[localize('ui.panel.config.cloud.login.introduction2a')]]
              </p>
              <p>
                [[localize('ui.panel.config.cloud.login.introduction3')]]
              </p>
              <p>
                <a
                  href="https://www.nabucasa.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  [[localize('ui.panel.config.cloud.login.learn_more_link')]]
                </a>
              </p>
            </div>

            <ha-card hidden$="[[!flashMessage]]">
              <div class="card-content flash-msg">
                [[flashMessage]]
                <paper-icon-button icon="hass:close" on-click="_dismissFlash"
                  >[[localize('ui.panel.config.cloud.login.dismiss')]]</paper-icon-button
                >
                <paper-ripple id="flashRipple" noink=""></paper-ripple>
              </div>
            </ha-card>

            <ha-card
              header="[[localize('ui.panel.config.cloud.login.sign_in')]]"
            >
              <div class="card-content">
                <div class="error" hidden$="[[!_error]]">[[_error]]</div>
                <paper-input
                  label="[[localize('ui.panel.config.cloud.login.email')]]"
                  id="email"
                  type="email"
                  value="{{email}}"
                  on-keydown="_keyDown"
                  error-message="[[localize('ui.panel.config.cloud.login.email_error_msg')]]"
                ></paper-input>
                <paper-input
                  id="password"
                  label="[[localize('ui.panel.config.cloud.login.password')]]"
                  value="{{_password}}"
                  type="password"
                  on-keydown="_keyDown"
                  error-message="[[localize('ui.panel.config.cloud.login.password_error_msg')]]"
                ></paper-input>
              </div>
              <div class="card-actions">
                <ha-progress-button
                  on-click="_handleLogin"
                  progress="[[_requestInProgress]]"
                  >[[localize('ui.panel.config.cloud.login.sign_in')]]</ha-progress-button
                >
                <mwc-button
                  class="link"
                  hidden="[[_requestInProgress]]"
                  on-click="_handleForgotPassword"
                >
                  [[localize('ui.panel.config.cloud.login.forgot_password')]]
                </button>
              </div>
            </ha-card>

            <ha-card>
              <paper-item on-click="_handleRegister">
                <paper-item-body two-line="">
                  [[localize('ui.panel.config.cloud.login.start_trial')]]
                  <div secondary="">
                    [[localize('ui.panel.config.cloud.login.trial_info')]]
                  </div>
                </paper-item-body>
                <ha-icon-next></ha-icon-next>
              </paper-item>
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
      _password: {
        type: String,
        value: "",
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
    return ["_inputChanged(email, _password)"];
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.flashMessage) {
      // Wait for DOM to be drawn
      requestAnimationFrame(() =>
        requestAnimationFrame(() => this.$.flashRipple.simulatedRipple())
      );
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
      .callApi("post", "cloud/login", {
        email: this.email,
        password: this._password,
      })
      .then(
        () => {
          this.fire("ha-refresh-cloud-status");
          this.setProperties({
            email: "",
            _password: "",
          });
        },
        (err) => {
          // Do this before setProperties because changing it clears errors.
          this._password = "";

          const errCode = err && err.body && err.body.code;
          if (errCode === "PasswordChangeRequired") {
            alert(
              "[[localize('ui.panel.config.cloud.login.alert_password_change_required')]]"
            );
            this.navigate("/config/cloud/forgot-password");
            return;
          }

          const props = {
            _requestInProgress: false,
            _error:
              err && err.body && err.body.message
                ? err.body.message
                : "Unknown error",
          };

          if (errCode === "UserNotConfirmed") {
            props._error =
              "[[localize('ui.panel.config.cloud.login.alert_email_confirm_necessary')]]";
          }

          this.setProperties(props);
          this.$.email.focus();
        }
      );
  }

  _handleRegister() {
    this.flashMessage = "";
    this.navigate("/config/cloud/register");
  }

  _handleForgotPassword() {
    this.flashMessage = "";
    this.navigate("/config/cloud/forgot-password");
  }

  _dismissFlash() {
    // give some time to let the ripple finish.
    setTimeout(() => {
      this.flashMessage = "";
    }, 200);
  }
}

customElements.define("cloud-login", CloudLogin);
