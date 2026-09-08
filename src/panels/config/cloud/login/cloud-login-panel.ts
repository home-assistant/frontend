import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import { navigate } from "../../../../common/navigate";
import "../../../../components/ha-alert";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { cloudSignedOutStyle } from "../cloud-signed-out-style";
import { cloudSubpageStyle } from "../account/cloud-subpage-style";
import "./cloud-login";
import type { CloudLogin } from "./cloud-login";

@customElement("cloud-login-panel")
export class CloudLoginPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property() public email?: string;

  @property({ attribute: false }) public flashMessage?: string;

  @query("cloud-login") private _cloudLoginElement?: CloudLogin;

  protected firstUpdated(): void {
    this._focusEmail();
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config/cloud/start"
        .header=${this.hass.localize("ui.panel.config.cloud.login.sign_in")}
      >
        <div class="content">
          ${
            this.flashMessage
              ? html`<ha-alert
                  dismissable
                  @alert-dismissed-clicked=${this._dismissFlash}
                >
                  ${this.flashMessage}
                </ha-alert>`
              : nothing
          }
          <cloud-login
            .hass=${this.hass}
            .email=${this.email}
            .localize=${this.hass.localize}
            .lead=${this.hass.localize(
              "ui.panel.config.cloud.login.sign_in_lead"
            )}
            check-connection
            @cloud-forgot-password=${this._handleForgotPassword}
          ></cloud-login>
        </div>
      </hass-subpage>
    `;
  }

  private async _focusEmail() {
    const cloudLogin = this._cloudLoginElement;
    if (!cloudLogin) {
      return;
    }
    await cloudLogin.updateComplete;
    cloudLogin.emailField?.focus();
  }

  private _handleForgotPassword(
    ev: HASSDomEvent<HASSDomEvents["cloud-forgot-password"]>
  ) {
    this._dismissFlash();
    fireEvent(this, "cloud-email-changed", { value: ev.detail.email });
    navigate("/config/cloud/forgot-password");
  }

  private _dismissFlash() {
    fireEvent(this, "flash-message-changed", { value: "" });
  }

  static get styles() {
    return [
      haStyle,
      cloudSubpageStyle,
      cloudSignedOutStyle,
      css`
        .content {
          gap: var(--ha-space-4);
        }
        ha-alert,
        cloud-login {
          display: block;
          width: 100%;
          max-width: 600px;
          margin-inline: auto;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-login-panel": CloudLoginPanel;
  }

  interface HASSDomEvents {
    "cloud-email-changed": { value: string };
    "flash-message-changed": { value: string };
  }
}
