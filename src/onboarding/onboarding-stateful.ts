import { TemplateResult, html, customElement, property } from "lit-element";
import { HassElement } from "../state/hass-element";
import {
  genClientId,
  getAuth,
  createConnection,
  Auth,
  Connection,
} from "home-assistant-js-websocket";
import { hassUrl } from "../data/auth";
import "./onboarding-integrations";
import { LocalizeFunc } from "../common/translations/localize";

@customElement("onboarding-stateful")
class OnboardingStateful extends HassElement {
  @property() public onboardingLocalize!: LocalizeFunc;
  @property() public auth!: Auth;
  @property() public conn!: Connection;

  protected render(): TemplateResult | void {
    if (!this.hass) {
      return html`
        <button @click=${this._connect}>Connect</button>
      `;
    }

    return html`
      <onboarding-integrations
        .hass=${this.hass}
        .onboardingLocalize=${this.onboardingLocalize}
      ></onboarding-integrations>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this.initializeHass(this.auth, this.conn);
    // this._connect();
  }

  private async _connect() {
    const resp = await fetch("/api/onboarding/temp_auth_code", {
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify({ client_id: genClientId() }),
    });
    const data = await resp.json();
    console.log(data);
    // data.auth_code
    // pass to HAWS getAuth
    const auth = await getAuth({
      hassUrl,
      authCode: data.auth_code,
    });
    const conn = await createConnection({ auth });
    this.initializeHass(auth, conn);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-stateful": OnboardingStateful;
  }
}
