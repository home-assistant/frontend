import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/buttons/ha-progress-button";
import "../../../../components/ha-alert";
import "../../../../components/ha-card";
import "../../../../components/ha-textfield";
import type { HaTextField } from "../../../../components/ha-textfield";
import { cloudRegister, cloudResendVerification } from "../../../../data/cloud";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import "../../ha-config-section";

@customElement("cloud-register")
export class CloudRegister extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property() public email?: string;

  @state() private _requestInProgress = false;

  @state() private _password = "";

  @state() private _error?: string;

  @query("#email", true) private _emailField!: HaTextField;

  @query("#password", true) private _passwordField!: HaTextField;

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.cloud.register.title")}
      >
        <div class="content">
          <ha-config-section .isWide=${this.isWide}>
            <span slot="header"
              >${this.hass.localize(
                "ui.panel.config.cloud.register.headline"
              )}</span
            >
            <div slot="introduction">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.register.information"
                )}
              </p>
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.register.information2"
                )}
              </p>
              <ul>
                <li>
                  ${this.hass.localize(
                    "ui.panel.config.cloud.register.feature_remote_control"
                  )}
                </li>
                <li>
                  ${this.hass.localize(
                    "ui.panel.config.cloud.register.feature_google_home"
                  )}
                </li>
                <li>
                  ${this.hass.localize(
                    "ui.panel.config.cloud.register.feature_amazon_alexa"
                  )}
                </li>
                <li>
                  ${this.hass.localize(
                    "ui.panel.config.cloud.register.feature_webhook_apps"
                  )}
                </li>
              </ul>
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.register.information3"
                )}
                <a href="https://www.nabucasa.com" target="_blank"
                  >Nabu&nbsp;Casa,&nbsp;Inc</a
                >
                ${this.hass.localize(
                  "ui.panel.config.cloud.register.information3a"
                )}
              </p>
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.register.information4"
                )}
              </p>
              <ul>
                <li>
                  <a
                    href="https://www.nabucasa.com/tos/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    ${this.hass.localize(
                      "ui.panel.config.cloud.register.link_terms_conditions"
                    )}
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.nabucasa.com/privacy_policy/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    ${this.hass.localize(
                      "ui.panel.config.cloud.register.link_privacy_policy"
                    )}
                  </a>
                </li>
              </ul>
            </div>
            <ha-card
              outlined
              .header=${this.hass.localize(
                "ui.panel.config.cloud.register.create_account"
              )}
              ><div class="card-content register-form">
                ${this._error
                  ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
                  : ""}
                <ha-textfield
                  autofocus
                  id="email"
                  name="email"
                  .label=${this.hass.localize(
                    "ui.panel.config.cloud.register.email_address"
                  )}
                  type="email"
                  autocomplete="email"
                  required
                  .value=${this.email}
                  @keydown=${this._keyDown}
                  validationMessage=${this.hass.localize(
                    "ui.panel.config.cloud.register.email_error_msg"
                  )}
                ></ha-textfield>
                <ha-textfield
                  id="password"
                  name="password"
                  .label=${this.hass.localize(
                    "ui.panel.config.cloud.register.password"
                  )}
                  .value=${this._password}
                  type="password"
                  autocomplete="new-password"
                  minlength="8"
                  required
                  @keydown=${this._keyDown}
                  validationMessage=${this.hass.localize(
                    "ui.panel.config.cloud.register.password_error_msg"
                  )}
                ></ha-textfield>
              </div>
              <div class="card-actions">
                <ha-progress-button
                  @click=${this._handleRegister}
                  .progress=${this._requestInProgress}
                  >${this.hass.localize(
                    "ui.panel.config.cloud.register.start_trial"
                  )}</ha-progress-button
                >
                <button
                  class="link"
                  .disabled=${this._requestInProgress}
                  @click=${this._handleResendVerifyEmail}
                >
                  ${this.hass.localize(
                    "ui.panel.config.cloud.register.resend_confirm_email"
                  )}
                </button>
              </div>
            </ha-card>
          </ha-config-section>
        </div>
      </hass-subpage>
    `;
  }

  private _keyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      this._handleRegister();
    }
  }

  private async _handleRegister() {
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
      await cloudRegister(this.hass, email, password);
      this._verificationEmailSent(email);
    } catch (err: any) {
      this._password = "";
      this._requestInProgress = false;
      this._error =
        err && err.body && err.body.message
          ? err.body.message
          : "Unknown error";
    }
  }

  private async _handleResendVerifyEmail() {
    const emailField = this._emailField;

    const email = emailField.value;

    if (!emailField.reportValidity()) {
      emailField.focus();
      return;
    }

    try {
      await cloudResendVerification(this.hass, email);
      this._verificationEmailSent(email);
    } catch (err: any) {
      this._error =
        err && err.body && err.body.message
          ? err.body.message
          : "Unknown error";
    }
  }

  private _verificationEmailSent(email: string) {
    this._requestInProgress = false;
    this._password = "";
    // @ts-ignore
    fireEvent(this, "email-changed", { value: email });
    // @ts-ignore
    fireEvent(this, "cloud-done", {
      flashMessage: this.hass.localize(
        "ui.panel.config.cloud.register.account_created"
      ),
    });
  }

  static get styles() {
    return [
      haStyle,
      css`
        [slot="introduction"] {
          margin: -1em 0;
        }
        [slot="introduction"] a {
          color: var(--primary-color);
        }
        a {
          color: var(--primary-color);
        }
        h1 {
          margin: 0;
        }
        .register-form {
          display: flex;
          flex-direction: column;
        }
        .card-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-register": CloudRegister;
  }
}
