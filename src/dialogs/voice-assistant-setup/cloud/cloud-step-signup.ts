import { LitElement, css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-password-field";
import type { HaPasswordField } from "../../../components/ha-password-field";
import "../../../components/ha-svg-icon";
import "../../../components/ha-textfield";
import type { HaTextField } from "../../../components/ha-textfield";
import {
  cloudLogin,
  cloudRegister,
  cloudResendVerification,
} from "../../../data/cloud";
import type { HomeAssistant } from "../../../types";
import { AssistantSetupStyles } from "../styles";

@customElement("cloud-step-signup")
export class CloudStepSignup extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _requestInProgress = false;

  @state() private _email?: string;

  @state() private _password?: string;

  @state() private _error?: string;

  @state() private _state?: "VERIFY";

  @query("#email", true) private _emailField!: HaTextField;

  @query("#password", true) private _passwordField!: HaPasswordField;

  render() {
    return html`<div class="content">
        <img
          src=${`/static/images/logo_nabu_casa${this.hass.themes?.darkMode ? "_dark" : ""}.png`}
          alt="Nabu Casa logo"
        />
        <h1>
          ${this.hass.localize("ui.panel.config.cloud.register.create_account")}
        </h1>
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : ""}
        ${this._state === "VERIFY"
          ? html`<p>
              ${this.hass.localize(
                "ui.panel.config.cloud.register.confirm_email",
                { email: this._email }
              )}
            </p>`
          : html`<ha-textfield
                autofocus
                id="email"
                name="email"
                .label=${this.hass.localize(
                  "ui.panel.config.cloud.register.email_address"
                )}
                .disabled=${this._requestInProgress}
                type="email"
                autocomplete="email"
                required
                @keydown=${this._keyDown}
                validationMessage=${this.hass.localize(
                  "ui.panel.config.cloud.register.email_error_msg"
                )}
              ></ha-textfield>
              <ha-password-field
                id="password"
                name="password"
                .label=${this.hass.localize(
                  "ui.panel.config.cloud.register.password"
                )}
                .disabled=${this._requestInProgress}
                autocomplete="new-password"
                minlength="8"
                required
                @keydown=${this._keyDown}
                validationMessage=${this.hass.localize(
                  "ui.panel.config.cloud.register.password_error_msg"
                )}
              ></ha-password-field>`}
      </div>
      <div class="footer side-by-side">
        ${this._state === "VERIFY"
          ? html`<ha-button
                @click=${this._handleResendVerifyEmail}
                .disabled=${this._requestInProgress}
                appearance="plain"
                >${this.hass.localize(
                  "ui.panel.config.cloud.register.resend_confirm_email"
                )}</ha-button
              ><ha-button
                @click=${this._login}
                .disabled=${this._requestInProgress}
                >${this.hass.localize(
                  "ui.panel.config.cloud.register.clicked_confirm"
                )}</ha-button
              >`
          : html`<ha-button
                @click=${this._signIn}
                .disabled=${this._requestInProgress}
                appearance="plain"
                >${this.hass.localize(
                  "ui.panel.config.cloud.login.sign_in"
                )}</ha-button
              >
              <ha-button
                @click=${this._handleRegister}
                .disabled=${this._requestInProgress}
                >${this.hass.localize("ui.common.next")}</ha-button
              >`}
      </div>`;
  }

  private _signIn() {
    fireEvent(this, "cloud-step", { step: "SIGNIN" });
  }

  private _keyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      this._handleRegister();
    }
  }

  private async _handleRegister() {
    const emailField = this._emailField;
    const passwordField = this._passwordField;

    if (!emailField.reportValidity()) {
      passwordField.reportValidity();
      emailField.focus();
      return;
    }

    if (!passwordField.reportValidity()) {
      passwordField.focus();
      return;
    }

    const email = emailField.value.toLowerCase();
    const password = passwordField.value;

    this._requestInProgress = true;

    try {
      await cloudRegister(this.hass, email, password);
      this._email = email;
      this._password = password;
      this._verificationEmailSent();
    } catch (err: any) {
      this._password = "";
      this._error = err?.body?.message ?? "Unknown error";
    } finally {
      this._requestInProgress = false;
    }
  }

  private async _handleResendVerifyEmail() {
    if (!this._email) {
      return;
    }
    try {
      await cloudResendVerification(this.hass, this._email);
      this._verificationEmailSent();
    } catch (err: any) {
      this._error =
        err && err.body && err.body.message
          ? err.body.message
          : "Unknown error";
    }
  }

  private _verificationEmailSent() {
    this._state = "VERIFY";

    setTimeout(() => this._login(), 5000);
  }

  private async _login() {
    if (!this._email || !this._password) {
      return;
    }

    try {
      await cloudLogin({
        hass: this.hass,
        email: this._email,
        password: this._password,
      });
      fireEvent(this, "cloud-step", { step: "DONE" });
    } catch (e: any) {
      if (e?.body?.code === "usernotconfirmed") {
        this._verificationEmailSent();
      } else {
        this._error = "Something went wrong. Please try again.";
      }
    }
  }

  static styles = [
    AssistantSetupStyles,
    css`
      .content {
        width: 100%;
      }
      ha-textfield,
      ha-password-field {
        display: block;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-step-signup": CloudStepSignup;
  }
}
