import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "./cloud-forgot-password-card";
import { cloudForgotPassword } from "../../../../data/cloud";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";

@customElement("cloud-forgot-password")
export class CloudForgotPassword extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property() public email?: string;

  @state() public _requestInProgress = false;

  @state() private _error?: string;

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
          <cloud-forgot-password-card
            .localize=${this.hass.localize}
            .email=${this.email}
            .inProgress=${this._requestInProgress}
            .error=${this._error}
            @cloud-forgot-password=${this._handleEmailPasswordReset}
          ></cloud-forgot-password-card>
        </div>
      </hass-subpage>
    `;
  }

  private async _handleEmailPasswordReset(ev: CustomEvent) {
    const email = ev.detail.email;

    this._requestInProgress = true;

    const doResetPassword = async (username: string) => {
      try {
        await cloudForgotPassword(this.hass, username);
        // @ts-ignore
        fireEvent(this, "email-changed", { value: username });
        this._requestInProgress = false;
        // @ts-ignore
        fireEvent(this, "cloud-done", {
          flashMessage: this.hass.localize(
            "ui.panel.config.cloud.forgot_password.check_your_email"
          ),
        });
      } catch (err: any) {
        this._requestInProgress = false;
        const errCode = err && err.body && err.body.code;
        if (errCode === "usernotfound" && username !== username.toLowerCase()) {
          await doResetPassword(username.toLowerCase());
        } else {
          this._error =
            err && err.body && err.body.message
              ? err.body.message
              : "Unknown error";
        }
      }
    };
    await doResetPassword(email);
  }

  static get styles() {
    return [
      haStyle,
      css`
        .content {
          padding-bottom: 24px;
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
