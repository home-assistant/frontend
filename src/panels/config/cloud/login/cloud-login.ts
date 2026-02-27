import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/buttons/ha-progress-button";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-input";
import type { HaInput } from "../../../../components/ha-input";
import { setAssistPipelinePreferred } from "../../../../data/assist_pipeline";
import { cloudLogin } from "../../../../data/cloud";
import { loginHaCloud } from "../../../../data/onboarding";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../lovelace/custom-card-helpers";
import { showCloudAlreadyConnectedDialog } from "../dialog-cloud-already-connected/show-dialog-cloud-already-connected";

@customElement("cloud-login")
export class CloudLogin extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean, attribute: "check-connection" })
  public checkConnection = false;

  @property() public email?: string;

  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ attribute: "translation-key-panel" }) public translationKeyPanel:
    | "page-onboarding.restore.ha-cloud"
    | "config.cloud" = "config.cloud";

  @property({ type: Boolean, attribute: "card-less" }) public cardLess = false;

  @query("#email", true) public emailField!: HaInput;

  @query("#password", true) private _passwordField!: HaInput;

  @state() private _error?: string;

  @state() private _inProgress = false;

  protected render(): TemplateResult {
    if (this.cardLess) {
      return this._renderLoginForm();
    }

    return html`
      <ha-card
        outlined
        .header=${this.localize(
          `ui.panel.${this.translationKeyPanel}.login.sign_in`
        )}
      >
        ${this._renderLoginForm()}
      </ha-card>
    `;
  }

  private _renderLoginForm() {
    return html`
      <div class="card-content login-form">
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing}
        <ha-input
          .label=${this.localize(
            `ui.panel.${this.translationKeyPanel}.login.email`
          )}
          id="email"
          name="username"
          type="email"
          hint="This should be a real email address, not an alias. If you used an alias to register, use the email address that the alias forwards to."
          autocomplete="username"
          required
          .value=${this.email ?? ""}
          @keydown=${this._keyDown}
          .disabled=${this._inProgress}
          .validationMessage=${this.localize(
            `ui.panel.${this.translationKeyPanel}.login.email_error_msg`
          )}
        ></ha-input>
        <ha-input
          id="password"
          type="password"
          password-toggle
          name="password"
          hint="Use your nabu casa password, not your Home Assistant password. If you don't remember it, use the forgot password link below."
          .label=${this.localize(
            `ui.panel.${this.translationKeyPanel}.login.password`
          )}
          autocomplete="current-password"
          required
          minlength="8"
          @keydown=${this._keyDown}
          .disabled=${this._inProgress}
          .validationMessage=${this.localize(
            `ui.panel.${this.translationKeyPanel}.login.password_error_msg`
          )}
        ></ha-input>
      </div>
      <div class="card-actions">
        <ha-button
          appearance="plain"
          .disabled=${this._inProgress}
          @click=${this._handleForgotPassword}
        >
          ${this.localize(
            `ui.panel.${this.translationKeyPanel}.login.forgot_password`
          )}
        </ha-button>
        <ha-progress-button
          @click=${this._handleLogin}
          .progress=${this._inProgress}
          >${this.localize(
            `ui.panel.${this.translationKeyPanel}.login.sign_in`
          )}</ha-progress-button
        >
      </div>
    `;
  }

  private _keyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      this._handleLogin();
    }
  }

  private _handleCloudLoginError = async (
    err: any,
    email: string,
    password: string,
    checkConnection: boolean
  ): Promise<"cancel" | "password-change" | string | undefined> => {
    const errCode = err && err.body && err.body.code;
    if (errCode === "mfarequired") {
      const totpCode = await showPromptDialog(this, {
        title: this.localize(
          `ui.panel.${this.translationKeyPanel}.login.totp_code_prompt_title`
        ),
        inputLabel: this.localize(
          `ui.panel.${this.translationKeyPanel}.login.totp_code`
        ),
        inputType: "text",
        defaultValue: "",
        confirmText: this.localize(
          `ui.panel.${this.translationKeyPanel}.login.submit`
        ),
        dismissText: this.localize(
          `ui.panel.${this.translationKeyPanel}.login.cancel`
        ),
      });
      if (totpCode !== null && totpCode !== "") {
        this._login(email, password, checkConnection, totpCode.trim());
        return "continue";
      }
    }
    if (errCode === "alreadyconnectederror") {
      const logInHere = await showCloudAlreadyConnectedDialog(this, {
        details: JSON.parse(err.body.message),
      });
      if (logInHere) {
        this._login(email, password, false);
      }

      return logInHere ? "continue" : "cancel";
    }
    if (errCode === "PasswordChangeRequired") {
      showAlertDialog(this, {
        title: this.localize(
          `ui.panel.${this.translationKeyPanel}.login.alert_password_change_required`
        ),
      });
      return "password-change";
    }
    if (errCode === "usernotfound" && email !== email.toLowerCase()) {
      this._login(email.toLowerCase(), password, checkConnection);
      return undefined;
    }

    switch (errCode) {
      case "UserNotConfirmed":
        return this.localize(
          `ui.panel.${this.translationKeyPanel}.login.alert_email_confirm_necessary`
        );
      case "mfarequired":
        return this.localize(
          `ui.panel.${this.translationKeyPanel}.login.alert_mfa_code_required`
        );
      case "mfaexpiredornotstarted":
        return this.localize(
          `ui.panel.${this.translationKeyPanel}.login.alert_mfa_expired_or_not_started`
        );
      case "invalidtotpcode":
        return this.localize(
          `ui.panel.${this.translationKeyPanel}.login.alert_totp_code_invalid`
        );
      default:
        return err && err.body && err.body.message
          ? err.body.message
          : "Unknown error";
    }
  };

  private _login = async (
    email: string,
    password: string,
    checkConnection: boolean,
    code?: string
  ): Promise<undefined> => {
    if (!password && !code) {
      throw new Error("Password or code required");
    }

    try {
      if (this.hass) {
        const result = await cloudLogin({
          hass: this.hass,
          email,
          ...(code ? { code } : { password }),
          check_connection: checkConnection,
        });
        if (result.cloud_pipeline) {
          if (
            await showConfirmationDialog(this, {
              title: this.hass.localize(
                "ui.panel.config.cloud.login.cloud_pipeline_title"
              ),
              text: this.hass.localize(
                "ui.panel.config.cloud.login.cloud_pipeline_text"
              ),
              confirmText: this.hass.localize("ui.common.yes"),
              dismissText: this.hass.localize("ui.common.no"),
            })
          ) {
            setAssistPipelinePreferred(this.hass, result.cloud_pipeline);
          }
        }
      } else {
        // for onboarding
        await loginHaCloud({
          email,
          ...(code ? { code } : { password: password! }),
        });
      }
      this.email = "";
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      const error = await this._handleCloudLoginError(
        err,
        email,
        password,
        checkConnection
      );

      if (error === "cancel") {
        this._inProgress = false;
        this.email = "";
        this._passwordField.value = "";
        return;
      }
      if (error === "password-change") {
        this._handleForgotPassword();
        return;
      }

      if (error !== "continue") {
        this._inProgress = false;
        this._error = error;
      }
    }
  };

  private async _handleLogin() {
    if (!this._inProgress) {
      let valid = true;

      if (!this.emailField.reportValidity()) {
        this.emailField.focus();
        valid = false;
      }

      if (!this._passwordField.reportValidity()) {
        if (valid) {
          this._passwordField.focus();
        }
        valid = false;
      }

      if (!valid) {
        return;
      }

      this._inProgress = true;

      this._login(
        this.emailField.value as string,
        this._passwordField.value as string,
        this.checkConnection
      );
    }
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
    "cloud-forgot-password": {
      email: string;
    };
  }
}
