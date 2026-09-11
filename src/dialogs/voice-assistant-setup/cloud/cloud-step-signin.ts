import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import "../../../panels/config/cloud/login/cloud-login";
import type { HomeAssistant } from "../../../types";
import { AssistantSetupStyles } from "../styles";

@customElement("cloud-step-signin")
export class CloudStepSignin extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public email?: string;

  render() {
    return html`<div class="content">
      <img
        src=${`/static/images/logo_nabu_casa${this.hass.themes?.darkMode ? "_dark" : ""}.png`}
        alt="Nabu Casa logo"
      />
      <h1>${this.hass.localize("ui.panel.config.cloud.login.sign_in")}</h1>
      <cloud-login
        card-less
        check-connection
        .hass=${this.hass}
        .email=${this.email}
        .localize=${this.hass.localize}
        @cloud-forgot-password=${this._forgotPassword}
        @cloud-logged-in=${this._loggedIn}
      ></cloud-login>
    </div>`;
  }

  private _loggedIn() {
    fireEvent(this, "cloud-step", { step: "DONE" });
  }

  private _forgotPassword() {
    navigate("/config/cloud/forgot-password");
    fireEvent(this, "closed");
  }

  static styles = [
    AssistantSetupStyles,
    css`
      :host {
        display: block;
      }
      .content {
        width: 100%;
      }
      cloud-login {
        display: block;
        text-align: start;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-step-signin": CloudStepSignin;
  }
}
