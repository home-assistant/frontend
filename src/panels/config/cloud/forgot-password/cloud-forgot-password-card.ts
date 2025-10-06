import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/buttons/ha-progress-button";
import "../../../../components/ha-alert";
import "../../../../components/ha-card";
import type { HaTextField } from "../../../../components/ha-textfield";
import "../../../../components/ha-textfield";
import { haStyle } from "../../../../resources/styles";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import { cloudForgotPassword } from "../../../../data/cloud";
import { forgotPasswordHaCloud } from "../../../../data/onboarding";
import type { HomeAssistant } from "../../../../types";

@customElement("cloud-forgot-password-card")
export class CloudForgotPasswordCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ attribute: "translation-key-panel" }) public translationKeyPanel:
    | "page-onboarding.restore.ha-cloud.forgot_password"
    | "config.cloud.forgot_password" = "config.cloud.forgot_password";

  @property() public email?: string;

  @property({ type: Boolean, attribute: "card-less" }) public cardLess = false;

  @state() private _inProgress = false;

  @state() private _error?: string;

  @query("#email", true) public emailField!: HaTextField;

  protected render(): TemplateResult {
    if (this.cardLess) {
      return this._renderContent();
    }

    return html`
      <ha-card
        outlined
        .header=${this.localize(
          `ui.panel.${this.translationKeyPanel}.subtitle`
        )}
      >
        ${this._renderContent()}
      </ha-card>
    `;
  }

  private _renderContent() {
    return html`
      <div class="card-content">
        <p>
          ${this.localize(`ui.panel.${this.translationKeyPanel}.instructions`)}
        </p>
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing}
        <ha-textfield
          autofocus
          id="email"
          label=${this.localize(`ui.panel.${this.translationKeyPanel}.email`)}
          .value=${this.email ?? ""}
          type="email"
          required
          .disabled=${this._inProgress}
          @keydown=${this._keyDown}
          .validationMessage=${this.localize(
            `ui.panel.${this.translationKeyPanel}.email_error_msg`
          )}
        ></ha-textfield>
      </div>
      <div class="card-actions">
        <ha-progress-button
          @click=${this._handleEmailPasswordReset}
          .progress=${this._inProgress}
        >
          ${this.localize(
            `ui.panel.${this.translationKeyPanel}.send_reset_email`
          )}
        </ha-progress-button>
      </div>
    `;
  }

  private _keyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      this._handleEmailPasswordReset();
    }
  }

  private _resetPassword = async (email: string) => {
    this._inProgress = true;

    try {
      if (this.hass) {
        await cloudForgotPassword(this.hass, email);
      } else {
        // for onboarding
        await forgotPasswordHaCloud(email);
      }
      fireEvent(this, "cloud-email-changed", { value: email });
      this._inProgress = false;
      fireEvent(this, "cloud-done", {
        flashMessage: this.localize(
          `ui.panel.${this.translationKeyPanel}.check_your_email`
        ),
      });
    } catch (err: any) {
      this._inProgress = false;
      const errCode = err?.body?.code;
      if (errCode === "usernotfound" && email !== email.toLowerCase()) {
        await this._resetPassword(email.toLowerCase());
      } else {
        this._error = err?.body?.message ?? "Unknown error";
      }
    }
  };

  private async _handleEmailPasswordReset() {
    const emailField = this.emailField;

    const email = emailField.value;

    if (!emailField.reportValidity()) {
      emailField.focus();
      return;
    }

    this._inProgress = true;

    this._resetPassword(email);
  }

  static get styles() {
    return [
      haStyle,
      css`
        ha-card {
          max-width: 600px;
          margin: 0 auto;
          margin-top: 24px;
        }
        h1 {
          margin: 0;
        }
        ha-textfield {
          width: 100%;
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-forgot-password-card": CloudForgotPasswordCard;
  }
}
