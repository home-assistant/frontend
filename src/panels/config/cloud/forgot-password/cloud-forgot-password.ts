import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/buttons/ha-progress-button";
import "../../../../components/ha-alert";
import "../../../../components/ha-card";
import type { HaTextField } from "../../../../components/ha-textfield";
import "../../../../components/ha-textfield";
import { cloudForgotPassword } from "../../../../data/cloud";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";

@customElement("cloud-forgot-password")
export class CloudForgotPassword extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property() public email?: string;

  @state() public _requestInProgress = false;

  @state() private _error?: string;

  @query("#email", true) private _emailField!: HaTextField;

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.cloud.forgot_password.title"
        )}
      >
        <div class="content">
          <ha-card
            outlined
            .header=${this.hass.localize(
              "ui.panel.config.cloud.forgot_password.subtitle"
            )}
          >
            <div class="card-content">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.forgot_password.instructions"
                )}
              </p>
              ${this._error
                ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
                : ""}
              <ha-textfield
                autofocus
                id="email"
                label=${this.hass.localize(
                  "ui.panel.config.cloud.forgot_password.email"
                )}
                .value=${this.email}
                type="email"
                required
                @keydown=${this._keyDown}
                .validationMessage=${this.hass.localize(
                  "ui.panel.config.cloud.forgot_password.email_error_msg"
                )}
              ></ha-textfield>
            </div>
            <div class="card-actions">
              <ha-progress-button
                @click=${this._handleEmailPasswordReset}
                .progress=${this._requestInProgress}
              >
                ${this.hass.localize(
                  "ui.panel.config.cloud.forgot_password.send_reset_email"
                )}
              </ha-progress-button>
            </div>
          </ha-card>
        </div>
      </hass-subpage>
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

    this._requestInProgress = true;

    try {
      await cloudForgotPassword(this.hass, email);
      // @ts-ignore
      fireEvent(this, "email-changed", { value: email });
      this._requestInProgress = false;
      // @ts-ignore
      fireEvent(this, "cloud-done", {
        flashMessage: this.hass.localize(
          "ui.panel.config.cloud.forgot_password.check_your_email"
        ),
      });
    } catch (err: any) {
      this._requestInProgress = false;
      this._error =
        err && err.body && err.body.message
          ? err.body.message
          : "Unknown error";
    }
  }

  static get styles() {
    return [
      haStyle,
      css`
        .content {
          padding-bottom: 24px;
        }
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
          justify-content: space-between;
          align-items: center;
        }
        .card-actions a {
          color: var(--primary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-forgot-password": CloudForgotPassword;
  }
}
