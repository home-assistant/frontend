import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../panels/config/cloud/login/cloud-login";
import { haStyle } from "../../resources/styles";
import type { LocalizeFunc } from "../../common/translations/localize";
import type { BackupContentExtended } from "../../data/backup";
import { fireEvent } from "../../common/dom/fire_event";
import { brandsUrl } from "../../util/brands-url";
import { loginHaCloud } from "../../data/onboarding";
import {
  showAlertDialog,
  showPromptDialog,
} from "../../dialogs/generic/show-dialog-box";

@customElement("onboarding-restore-backup-cloud-login")
class OnboardingRestoreBackupCloudLogin extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ attribute: false }) public backup!: BackupContentExtended;

  @state() private _requestInProgress = false;

  @state() private _email?: string;

  @state() private _password?: string;

  @state() private _error?: string;

  // TODO translations should have a reference to the cloud translation key

  render() {
    return html`
      <h2>
        <img
          .src=${brandsUrl({
            domain: "cloud",
            type: "icon",
            useFallback: true,
            darkOptimized: matchMedia("(prefers-color-scheme: dark)").matches,
          })}
          crossorigin="anonymous"
          referrerpolicy="no-referrer"
          alt="Nabu Casa logo"
          slot="start"
        />
        ${this.localize("ui.panel.page-onboarding.restore.ha-cloud.title")}
      </h2>
      <cloud-login
        .email=${this._email}
        .password=${this._password}
        .inProgress=${this._requestInProgress}
        .error=${this._error}
        .localize=${this.localize}
        translation-key-panel="page-onboarding.restore.ha-cloud"
        @cloud-login=${this._handleLogin}
        @cloud-forgot-password=${this._handleForgotPassword}
      ></cloud-login>
    `;
  }

  // TODO extract this into data/cloud.ts
  private async _doLogin(email: string, password?: string, code?: string) {
    try {
      await loginHaCloud({
        email,
        ...(code ? { code } : { password: password! }),
      });
    } catch (err: any) {
      const errCode = err && err.body && err.body.code;
      if (errCode === "mfarequired") {
        const totpCode = await showPromptDialog(this, {
          title: this.localize(
            "ui.panel.page-onboarding.restore.ha-cloud.login.totp_code_prompt_title"
          ),
          inputLabel: this.localize(
            "ui.panel.page-onboarding.restore.ha-cloud.login.totp_code"
          ),
          inputType: "text",
          defaultValue: "",
          confirmText: this.localize(
            "ui.panel.page-onboarding.restore.ha-cloud.login.submit"
          ),
        });
        if (totpCode !== null && totpCode !== "") {
          await this._doLogin(email, totpCode);
          return;
        }
      }
      if (errCode === "PasswordChangeRequired") {
        showAlertDialog(this, {
          title: this.localize(
            "ui.panel.page-onboarding.restore.ha-cloud.login.alert_password_change_required"
          ),
        });
        // TODO navigate to forgot pw
        return;
      }
      if (errCode === "usernotfound" && email !== email.toLowerCase()) {
        await this._doLogin(email.toLowerCase());
        return;
      }

      this._password = "";
      this._requestInProgress = false;

      switch (errCode) {
        case "UserNotConfirmed":
          this._error = this.localize(
            "ui.panel.page-onboarding.restore.ha-cloud.login.alert_email_confirm_necessary"
          );
          break;
        case "mfarequired":
          this._error = this.localize(
            "ui.panel.page-onboarding.restore.ha-cloud.login.alert_mfa_code_required"
          );
          break;
        case "mfaexpiredornotstarted":
          this._error = this.localize(
            "ui.panel.page-onboarding.restore.ha-cloud.login.alert_mfa_expired_or_not_started"
          );
          break;
        case "invalidtotpcode":
          this._error = this.localize(
            "ui.panel.page-onboarding.restore.ha-cloud.login.alert_totp_code_invalid"
          );
          break;
        default:
          this._error =
            err && err.body && err.body.message
              ? err.body.message
              : "Unknown error";
          break;
      }

      // TODO focus email field
      // this._cloudLoginElement._emailField.focus();
    }
  }

  private async _handleLogin(ev: CustomEvent) {
    const email: string = ev.detail.email;
    const password: string = ev.detail.password;

    this._requestInProgress = true;

    await this._doLogin(email, password);
    // TODO reset email and password

    fireEvent(this, "upload-option-selected", "cloud");
  }

  private _handleForgotPassword() {
    // console.log("forgot password");
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          padding: 0 20px 24px;
        }
        h2 {
          font-size: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        h2 img {
          width: 48px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-restore-backup-cloud-login": OnboardingRestoreBackupCloudLogin;
  }
}
