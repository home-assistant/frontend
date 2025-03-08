import { css, html, LitElement, nothing, type CSSResultGroup } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../panels/config/cloud/login/cloud-login";
import { haStyle } from "../../resources/styles";
import type { LocalizeFunc } from "../../common/translations/localize";
import type { BackupContentExtended } from "../../data/backup";
import { fireEvent } from "../../common/dom/fire_event";
import { brandsUrl } from "../../util/brands-url";
import { forgotPasswordHaCloud, loginHaCloud } from "../../data/onboarding";
import { handleCloudLoginError } from "../../data/cloud";

@customElement("onboarding-restore-backup-cloud-login")
class OnboardingRestoreBackupCloudLogin extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ attribute: false }) public backup!: BackupContentExtended;

  @state() private _requestInProgress = false;

  @state() private _email?: string;

  @state() private _password?: string;

  @state() private _error?: string;

  @state() private _view: "login" | "forgot-password" | "loading" = "login";

  @state() private _showResetPasswordDone = false;

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
        />
        ${this.localize("ui.panel.page-onboarding.restore.ha-cloud.title")}
      </h2>
      ${this._showResetPasswordDone ? this._renderResetPasswordDone() : nothing}
      ${this._view === "login"
        ? html`<cloud-login
            .email=${this._email}
            .password=${this._password}
            .inProgress=${this._requestInProgress}
            .error=${this._error}
            .localize=${this.localize}
            translation-key-panel="page-onboarding.restore.ha-cloud"
            @cloud-login=${this._handleLogin}
            @cloud-forgot-password=${this._showForgotPassword}
          ></cloud-login>`
        : this._view === "loading"
          ? html`<div class="loading">
              <ha-circular-progress
                indeterminate
                size="large"
              ></ha-circular-progress>
            </div>`
          : html`<cloud-forgot-password-card
              .localize=${this.localize}
              .inProgress=${this._requestInProgress}
              .error=${this._error}
              translation-key-panel="page-onboarding.restore.ha-cloud.forgot_password"
              @cloud-forgot-password=${this._handleForgotPassword}
            ></cloud-forgot-password-card>`}
    `;
  }

  private async _doLogin(
    email: string,
    password: string,
    checkConnection: boolean,
    code?: string
  ) {
    if (!password && !code) {
      throw new Error("Password or code required");
    }

    try {
      await loginHaCloud({
        email,
        ...(code ? { code } : { password: password! }),
      });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      const error = await handleCloudLoginError(
        err,
        this,
        email,
        password,
        checkConnection,
        this.localize,
        this._doLogin,
        "page-onboarding.restore.ha-cloud"
      );

      if (error === "cancel") {
        this._requestInProgress = false;
        this._email = "";
        this._password = "";
        return;
      }
      if (error === "password-change") {
        this._showForgotPassword();
        return;
      }
      if (error === "re-login") {
        return;
      }

      this._password = "";
      this._requestInProgress = false;
      this._error = error;
    }
  }

  private async _handleLogin(ev: CustomEvent) {
    const email: string = ev.detail.email;
    const password: string = ev.detail.password;

    this._requestInProgress = true;

    await this._doLogin(email, password, false);

    fireEvent(this, "upload-option-selected", "cloud");
  }

  private _renderResetPasswordDone() {
    return html`<ha-alert
      dismissable
      @alert-dismissed-clicked=${this._dismissResetPasswordDoneInfo}
    >
      ${this.localize(
        "ui.panel.page-onboarding.restore.ha-cloud.forgot_password.check_your_email"
      )}
    </ha-alert>`;
  }

  private async _showForgotPassword() {
    this._view = "loading";
    await import(
      "../../panels/config/cloud/forgot-password/cloud-forgot-password-card"
    );
    this._view = "forgot-password";
  }

  private async _resetPassword(email: string) {
    try {
      await forgotPasswordHaCloud(email);
      this._view = "login";
      this._showResetPasswordDone = true;
      this._requestInProgress = false;
    } catch (err: any) {
      const errCode = err && err.body && err.body.code;
      if (errCode === "usernotfound" && email !== email.toLowerCase()) {
        await this._resetPassword(email.toLowerCase());
      } else {
        this._requestInProgress = false;
        this._error =
          err && err.body && err.body.message
            ? err.body.message
            : "Unknown error";
      }
    }
  }

  private async _handleForgotPassword(ev: CustomEvent) {
    const email = ev.detail.email;

    this._requestInProgress = true;

    await this._resetPassword(email);
  }

  private _dismissResetPasswordDoneInfo() {
    this._showResetPasswordDone = false;
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
        .loading {
          display: flex;
          justify-content: center;
        }
        ha-alert {
          margin-bottom: 8px;
          display: block;
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
