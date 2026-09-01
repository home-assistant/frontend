import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import { navigate } from "../../../../common/navigate";
import type { CloudStatus } from "../../../../data/cloud";
import { cloudStatusAutoLogin } from "../../../../data/cloud";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "../cloud-signed-out-menu";
import { cloudSignedOutStyle } from "../cloud-signed-out-style";
import { cloudSubpageStyle } from "../account/cloud-subpage-style";
import "./cloud-register-card";

const BACK_PATH = "/config/cloud/start";

@customElement("cloud-register")
export class CloudRegister extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property() public email?: string;

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @state() private _confirming = false;

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path=${BACK_PATH}
        .backCallback=${this._confirming ? this._handleConfirmBack : undefined}
        .header=${this.hass.localize("ui.panel.config.cloud.register.headline")}
      >
        <cloud-signed-out-menu
          slot="toolbar-icon"
          .hass=${this.hass}
        ></cloud-signed-out-menu>
        <div class="content">
          <cloud-register-card
            .hass=${this.hass}
            .email=${this.email}
            .autoLogin=${cloudStatusAutoLogin(this.cloudStatus)}
            @cloud-register-view-changed=${this._viewChanged}
            @cloud-sign-in-instead=${this._handleSignInInstead}
          ></cloud-register-card>
        </div>
      </hass-subpage>
    `;
  }

  private _viewChanged(
    ev: HASSDomEvent<HASSDomEvents["cloud-register-view-changed"]>
  ) {
    this._confirming = ev.detail.confirming;
  }

  private _handleSignInInstead() {
    // Replaces only from the waiting view, whose registration is being
    // cancelled: browser-back must not return to it. The form is a page worth
    // going back to.
    navigate("/config/cloud/login", { replace: this._confirming });
  }

  private _handleConfirmBack = () => {
    fireEvent(this, "cloud-cancel-auto-login");
    navigate(BACK_PATH, { replace: true });
  };

  static get styles() {
    return [
      haStyle,
      cloudSubpageStyle,
      cloudSignedOutStyle,
      css`
        .content {
          gap: var(--ha-space-3);
        }
        cloud-register-card {
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
    "cloud-register": CloudRegister;
  }
}
