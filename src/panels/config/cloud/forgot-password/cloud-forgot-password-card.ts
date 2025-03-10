import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/buttons/ha-progress-button";
import "../../../../components/ha-alert";
import "../../../../components/ha-card";
import type { HaTextField } from "../../../../components/ha-textfield";
import "../../../../components/ha-textfield";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import type { LocalizeFunc } from "../../../../common/translations/localize";

@customElement("cloud-forgot-password-card")
export class CloudForgotPasswordCard extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ attribute: "translation-key-panel" }) public translationKeyPanel:
    | "page-onboarding.restore.ha-cloud.forgot_password"
    | "config.cloud.forgot_password" = "config.cloud.forgot_password";

  @property({ type: Boolean }) public narrow = false;

  @property() public email?: string;

  @property({ type: Boolean, attribute: "in-progress" }) public inProgress =
    false;

  @property() public error?: string;

  @property({ type: Boolean, attribute: "card-less" }) public cardLess = false;

  @query("#email", true) private _emailField!: HaTextField;

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
        ${this.error
          ? html`<ha-alert alert-type="error">${this.error}</ha-alert>`
          : nothing}
        <ha-textfield
          autofocus
          id="email"
          label=${this.localize(`ui.panel.${this.translationKeyPanel}.email`)}
          .value=${this.email ?? ""}
          type="email"
          required
          .disabled=${this.inProgress}
          @keydown=${this._keyDown}
          .validationMessage=${this.localize(
            `ui.panel.${this.translationKeyPanel}.email_error_msg`
          )}
        ></ha-textfield>
      </div>
      <div class="card-actions">
        <ha-progress-button
          @click=${this._handleEmailPasswordReset}
          .progress=${this.inProgress}
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

  private async _handleEmailPasswordReset() {
    const emailField = this._emailField;

    const email = emailField.value;

    if (!emailField.reportValidity()) {
      emailField.focus();
      return;
    }

    this.inProgress = true;

    fireEvent(this, "cloud-forgot-password", { email });
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

  interface HASSDomEvents {
    "cloud-forgot-password": {
      email: string;
    };
  }
}
