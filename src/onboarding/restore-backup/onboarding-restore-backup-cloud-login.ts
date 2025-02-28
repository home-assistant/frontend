import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../panels/config/cloud/login/cloud-login";
import { haStyle } from "../../resources/styles";
import type { LocalizeFunc } from "../../common/translations/localize";
import type { BackupContentExtended } from "../../data/backup";
import { fireEvent } from "../../common/dom/fire_event";
import { brandsUrl } from "../../util/brands-url";
import { loginHaCloud } from "../../data/onboarding";
import { handleCloudLoginError } from "../../data/cloud";

@customElement("onboarding-restore-backup-cloud-login")
class OnboardingRestoreBackupCloudLogin extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ attribute: false }) public backup!: BackupContentExtended;

  @state() private _requestInProgress = false;

  @state() private _email?: string;

  @state() private _password?: string;

  @state() private _error?: string;

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
        this._handleForgotPassword();
        return;
      }
      if (error === "re-login") {
        return;
      }

      this._password = "";
      this._requestInProgress = false;
      this._error = error;
      // this._cloudLoginElement._emailField.focus();
    }
  }

  private async _handleLogin(ev: CustomEvent) {
    const email: string = ev.detail.email;
    const password: string = ev.detail.password;

    this._requestInProgress = true;

    await this._doLogin(email, password, false);

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
