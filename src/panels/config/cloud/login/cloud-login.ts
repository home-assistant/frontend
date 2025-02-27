import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/buttons/ha-progress-button";
import "../../../../components/ha-alert";
import "../../../../components/ha-card";
import "../../../../components/ha-password-field";
import type { HaPasswordField } from "../../../../components/ha-password-field";
import "../../../../components/ha-textfield";
import type { HaTextField } from "../../../../components/ha-textfield";
import { haStyle } from "../../../../resources/styles";
import type { LocalizeFunc } from "../../../../common/translations/localize";

@customElement("cloud-login")
export class CloudLogin extends LitElement {
  @property() public email?: string;

  @property() public password?: string;

  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ type: Boolean, attribute: "in-progress" }) public inProgress =
    false;

  @property() public error?: string;

  @property({ attribute: "translation-key-panel" }) public translationKeyPanel:
    | "page-onboarding.restore.ha-cloud"
    | "config.cloud" = "config.cloud";

  @query("#email", true) public _emailField!: HaTextField;

  @query("#password", true) private _passwordField!: HaPasswordField;

  protected render(): TemplateResult {
    return html`
      <ha-card
        outlined
        .header=${this.localize(
          `ui.panel.${this.translationKeyPanel}.login.sign_in`
        )}
      >
        <div class="card-content login-form">
          ${this.error
            ? html`<ha-alert alert-type="error">${this.error}</ha-alert>`
            : nothing}
          <ha-textfield
            .label=${this.localize(
              `ui.panel.${this.translationKeyPanel}.login.email`
            )}
            id="email"
            name="username"
            type="email"
            autocomplete="username"
            required
            .value=${this.email ?? ""}
            @keydown=${this._keyDown}
            .disabled=${this.inProgress}
            .validationMessage=${this.localize(
              `ui.panel.${this.translationKeyPanel}.login.email_error_msg`
            )}
          ></ha-textfield>
          <ha-password-field
            id="password"
            name="password"
            .label=${this.localize(
              `ui.panel.${this.translationKeyPanel}.login.password`
            )}
            .value=${this.password || ""}
            autocomplete="current-password"
            required
            minlength="8"
            @keydown=${this._keyDown}
            .disabled=${this.inProgress}
            .validationMessage=${this.localize(
              `ui.panel.${this.translationKeyPanel}.login.password_error_msg`
            )}
          ></ha-password-field>
        </div>
        <div class="card-actions">
          <button
            class="link"
            .disabled=${this.inProgress}
            @click=${this._handleForgotPassword}
          >
            ${this.localize(
              `ui.panel.${this.translationKeyPanel}.login.forgot_password`
            )}
          </button>
          <ha-progress-button
            @click=${this._handleLogin}
            .progress=${this.inProgress}
            >${this.localize(
              `ui.panel.${this.translationKeyPanel}.login.sign_in`
            )}</ha-progress-button
          >
        </div>
      </ha-card>
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

    this.inProgress = true;

    fireEvent(this, "cloud-login", { email, password });
  }

  private _handleForgotPassword() {
    fireEvent(this, "cloud-forgot-password");
  }

  static get styles() {
    return [
      haStyle,
      css`
        ha-card {
          overflow: hidden;
        }
        ha-card .card-header {
          margin-bottom: -8px;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-login": CloudLogin;
  }

  interface HASSDomEvents {
    "cloud-login": {
      email: string;
      password: string;
    };
    "cloud-forgot-password";
  }
}
