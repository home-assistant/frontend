import "@material/mwc-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { navigate } from "../../../../common/navigate";
import "../../../../components/buttons/ha-progress-button";
import "../../../../components/ha-alert";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-next";
import type { HaTextField } from "../../../../components/ha-textfield";
import "../../../../components/ha-textfield";
import { cloudLogin } from "../../../../data/cloud";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import "../../../../styles/polymer-ha-style";
import { HomeAssistant } from "../../../../types";
import "../../ha-config-section";
import { setAssistPipelinePreferred } from "../../../../data/assist_pipeline";

@customElement("cloud-login")
export class CloudLogin extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property() public email?: string;

  @property() public flashMessage?: string;

  @state() private _password?: string;

  @state() private _requestInProgress = false;

  @state() private _error?: string;

  @query("#email", true) private _emailField!: HaTextField;

  @query("#password", true) private _passwordField!: HaTextField;

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        header="Home Assistant Cloud"
      >
        <div class="content">
          <ha-config-section .isWide=${this.isWide}>
            <span slot="header">Home Assistant Cloud</span>
            <div slot="introduction">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.login.introduction"
                )}
              </p>
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.login.introduction2"
                )}
                <a
                  href="https://www.nabucasa.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  Nabu&nbsp;Casa,&nbsp;Inc</a
                >${this.hass.localize(
                  "ui.panel.config.cloud.login.introduction2a"
                )}
              </p>
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.login.introduction3"
                )}
              </p>
              <p>
                <a
                  href="https://www.nabucasa.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  ${this.hass.localize(
                    "ui.panel.config.cloud.login.learn_more_link"
                  )}
                </a>
              </p>
            </div>

            ${this.flashMessage
              ? html`<ha-alert
                  dismissable
                  @alert-dismissed-clicked=${this._dismissFlash}
                >
                  ${this.flashMessage}
                </ha-alert>`
              : ""}

            <ha-card
              outlined
              .header=${this.hass.localize(
                "ui.panel.config.cloud.login.sign_in"
              )}
            >
              <div class="card-content login-form">
                ${this._error
                  ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
                  : ""}
                <ha-textfield
                  .label=${this.hass.localize(
                    "ui.panel.config.cloud.login.email"
                  )}
                  id="email"
                  name="username"
                  type="email"
                  autocomplete="username"
                  required
                  .value=${this.email}
                  @keydown=${this._keyDown}
                  .disabled=${this._requestInProgress}
                  .validationMessage=${this.hass.localize(
                    "ui.panel.config.cloud.login.email_error_msg"
                  )}
                ></ha-textfield>
                <ha-textfield
                  id="password"
                  name="password"
                  .label=${this.hass.localize(
                    "ui.panel.config.cloud.login.password"
                  )}
                  .value=${this._password || ""}
                  type="password"
                  autocomplete="current-password"
                  required
                  minlength="8"
                  @keydown=${this._keyDown}
                  .disabled=${this._requestInProgress}
                  .validationMessage=${this.hass.localize(
                    "ui.panel.config.cloud.login.password_error_msg"
                  )}
                ></ha-textfield>
                <button
                  class="link pwd-forgot-link"
                  .disabled=${this._requestInProgress}
                  @click=${this._handleForgotPassword}
                >
                  ${this.hass.localize(
                    "ui.panel.config.cloud.login.forgot_password"
                  )}
                </button>
              </div>
              <div class="card-actions">
                <ha-progress-button
                  @click=${this._handleLogin}
                  .progress=${this._requestInProgress}
                  >${this.hass.localize(
                    "ui.panel.config.cloud.login.sign_in"
                  )}</ha-progress-button
                >
              </div>
            </ha-card>

            <ha-card outlined>
              <paper-item @click=${this._handleRegister}>
                <paper-item-body two-line>
                  ${this.hass.localize(
                    "ui.panel.config.cloud.login.start_trial"
                  )}
                  <div secondary>
                    ${this.hass.localize(
                      "ui.panel.config.cloud.login.trial_info"
                    )}
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

  private _keyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      this._handleLogin();
    }
  }

  private async _handleLogin() {
    const emailField = this._emailField;
    const passwordField = this._passwordField;

    const email = emailField.value;
    const password = passwordField.value;

    if (!emailField.reportValidity()) {
      passwordField.reportValidity();
      emailField.focus();
      return;
    }

    if (!passwordField.reportValidity()) {
      passwordField.focus();
      return;
    }

    this._requestInProgress = true;

    try {
      const result = await cloudLogin(this.hass, email, password);
      fireEvent(this, "ha-refresh-cloud-status");
      this.email = "";
      this._password = "";
      if (result.cloud_pipeline) {
        if (
          await showConfirmationDialog(this, {
            title: this.hass.localize(
              "ui.panel.config.cloud.login.cloud_pipeline_title"
            ),
            text: this.hass.localize(
              "ui.panel.config.cloud.login.cloud_pipeline_text"
            ),
          })
        ) {
          setAssistPipelinePreferred(this.hass, result.cloud_pipeline);
        }
      }
    } catch (err: any) {
      const errCode = err && err.body && err.body.code;
      if (errCode === "PasswordChangeRequired") {
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.cloud.login.alert_password_change_required"
          ),
        });
        navigate("/config/cloud/forgot-password");
        return;
      }

      this._password = "";
      this._requestInProgress = false;

      if (errCode === "UserNotConfirmed") {
        this._error = this.hass.localize(
          "ui.panel.config.cloud.login.alert_email_confirm_necessary"
        );
      } else {
        this._error =
          err && err.body && err.body.message
            ? err.body.message
            : "Unknown error";
      }

      emailField.focus();
    }
  }

  private _handleRegister() {
    this._dismissFlash();
    // @ts-ignore
    fireEvent(this, "email-changed", { value: this._emailField.value });
    navigate("/config/cloud/register");
  }

  private _handleForgotPassword() {
    this._dismissFlash();
    // @ts-ignore
    fireEvent(this, "email-changed", { value: this._emailField.value });
    navigate("/config/cloud/forgot-password");
  }

  private _dismissFlash() {
    // @ts-ignore
    fireEvent(this, "flash-message-changed", { value: "" });
  }

  static get styles() {
    return [
      haStyle,
      css`
        .content {
          padding-bottom: 24px;
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
          margin: 0;
        }
        .card-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .login-form {
          display: flex;
          flex-direction: column;
        }
        .pwd-forgot-link {
          color: var(--secondary-text-color) !important;
          text-align: right !important;
          align-self: flex-end;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-login": CloudLogin;
  }
}
