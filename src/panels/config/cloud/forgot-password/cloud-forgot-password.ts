import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "./cloud-forgot-password-card";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";

@customElement("cloud-forgot-password")
export class CloudForgotPassword extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property() public email?: string;

  @state() public _requestInProgress = false;

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
            .hass=${this.hass}
            .localize=${this.hass.localize}
            .email=${this.email}
          ></cloud-forgot-password-card>
        </div>
      </hass-subpage>
    `;
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
