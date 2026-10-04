import { css, html, LitElement, nothing, type CSSResultGroup } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import { navigate } from "../../common/navigate";
import type { LocalizeFunc } from "../../common/translations/localize";
import { removeSearchParam } from "../../common/url/search-params";
import "../../components/ha-icon-button-arrow-prev";
import "../../components/ha-spinner";
import type { BackupContentExtended } from "../../data/backup";
import type { CloudForgotPasswordCard } from "../../panels/config/cloud/forgot-password/cloud-forgot-password-card";
import "../../panels/config/cloud/login/cloud-login";
import type { CloudLogin } from "../../panels/config/cloud/login/cloud-login";
import { onBoardingStyles } from "../styles";

@customElement("onboarding-restore-backup-cloud-login")
class OnboardingRestoreBackupCloudLogin extends LitElement {
  @property({ attribute: false }) public backup!: BackupContentExtended;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state() private _email?: string;

  @state() private _view: "login" | "forgot-password" | "loading" = "login";

  @state() private _showResetPasswordDone = false;

  @query("cloud-login") private _cloudLoginElement?: CloudLogin;

  @query("cloud-forgot-password-card")
  private _forgotPasswordElement?: CloudForgotPasswordCard;

  render() {
    return html`
      <ha-icon-button-arrow-prev
        .label=${this._localize("ui.panel.page-onboarding.restore.back")}
        @click=${this._back}
      ></ha-icon-button-arrow-prev>
      <h1>Home Assistant Cloud</h1>
      <p>
        ${this._localize(
          "ui.panel.page-onboarding.restore.ha-cloud.sign_in_description"
        )}
      </p>
      ${this._showResetPasswordDone ? this._renderResetPasswordDone() : nothing}
      ${
        this._view === "login"
          ? html`<cloud-login
              card-less
              .email=${this._email}
              translation-key-panel="page-onboarding.restore.ha-cloud"
              @cloud-forgot-password=${this._showForgotPassword}
            ></cloud-login>`
          : this._view === "loading"
            ? html`<div class="loading">
                <ha-spinner size="large"></ha-spinner>
              </div>`
            : html`<cloud-forgot-password-card
                card-less
                .email=${this._email}
                translation-key-panel="page-onboarding.restore.ha-cloud.forgot_password"
                @cloud-email-changed=${this._emailChanged}
                @cloud-done=${this._showPasswordResetDone}
              ></cloud-forgot-password-card>`
      }
    `;
  }

  private _back() {
    if (this._view === "forgot-password") {
      this._view = "login";
      return;
    }

    navigate(`${location.pathname}?${removeSearchParam("page")}`);
  }

  private _renderResetPasswordDone() {
    return html`<ha-alert
      dismissable
      @alert-dismissed-clicked=${this._dismissResetPasswordDoneInfo}
    >
      ${this._localize(
        "ui.panel.page-onboarding.restore.ha-cloud.forgot_password.check_your_email"
      )}
    </ha-alert>`;
  }

  private async _showForgotPassword() {
    this._view = "loading";
    if (this._cloudLoginElement) {
      this._email = this._cloudLoginElement.emailField.value;
    }

    await import("../../panels/config/cloud/forgot-password/cloud-forgot-password-card");
    this._view = "forgot-password";
  }

  private _emailChanged() {
    if (this._forgotPasswordElement) {
      this._email = this._forgotPasswordElement?.emailField.value;
    }
  }

  private _showPasswordResetDone() {
    this._view = "login";
    this._showResetPasswordDone = true;
  }

  private _dismissResetPasswordDoneInfo() {
    this._showResetPasswordDone = false;
  }

  static get styles(): CSSResultGroup {
    return [
      onBoardingStyles,
      css`
        h1,
        p {
          text-align: left;
        }
        h2 {
          font-size: var(--ha-font-size-2xl);
          display: flex;
          align-items: center;
          gap: var(--ha-space-4);
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
